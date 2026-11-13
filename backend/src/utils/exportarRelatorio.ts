import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// Descrição genérica de um relatório exportável
// Cada relatório só precisa dizer O QUE mostrar (título, resumo e tabelas);
// os geradores abaixo cuidam de COMO desenhar isso em PDF ou Excel.

export type Formato = 'texto' | 'numero' | 'moeda' | 'percentual';

export interface Coluna {
  titulo: string;
  chave: string;
  largura: number; // em caracteres (Excel); no PDF vira proporção da largura da página
  formato?: Formato;
}

export interface Tabela {
  titulo: string;
  colunas: Coluna[];
  linhas: Record<string, any>[];
}

export interface DocumentoRelatorio {
  titulo: string;
  nomeArquivo: string; // sem data e sem extensão, ex.: "relatorio-vendas"
  subtitulo: string;
  resumo: { rotulo: string; valor: number; formato?: Formato }[];
  tabelas: Tabela[];
}

const COR_MARCA = '#AA5A21';
const COR_TEXTO = '#1B1412';
const COR_CINZA = '#666666';
const MARGEM = 40;
const CAMINHO_LOGO = path.join(__dirname, '..', 'assets', 'logo-pdf.png');

function formatar(valor: any, formato: Formato = 'texto'): string {
  if (formato === 'moeda') return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (formato === 'percentual') return `${Number(valor).toFixed(1)}%`;
  return String(valor ?? '');
}

// Texto à esquerda, quantidades no centro, valores à direita.
function alinhamento(formato: Formato = 'texto'): 'left' | 'center' | 'right' {
  if (formato === 'numero') return 'center';
  if (formato === 'moeda' || formato === 'percentual') return 'right';
  return 'left';
}

// Excel

const FORMATO_EXCEL: Partial<Record<Formato, string>> = {
  moeda: 'R$ #,##0.00',
  percentual: '0.0"%"',
};

function adicionarAba(wb: ExcelJS.Workbook, nome: string, colunas: Coluna[], linhas: Record<string, any>[]) {
  // O Excel limita o nome da aba a 31 caracteres.
  const aba = wb.addWorksheet(nome.slice(0, 31));
  aba.columns = colunas.map((c) => ({
    header: c.titulo,
    key: c.chave,
    width: c.largura,
    style: { numFmt: FORMATO_EXCEL[c.formato ?? 'texto'] },
  }));
  aba.getRow(1).eachCell((celula) => {
    celula.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFAA5A21' } };
  });
  linhas.forEach((linha) => aba.addRow(linha));
  return aba;
}

export async function gerarExcel(doc: DocumentoRelatorio): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Estação do Chopp';

  if (doc.resumo.length > 0) {
    const aba = adicionarAba(
      wb,
      'Resumo',
      [
        { titulo: 'Indicador', chave: 'rotulo', largura: 28 },
        { titulo: 'Valor', chave: 'valor', largura: 20 },
      ],
      doc.resumo
    );
    // Cada linha do resumo pode ter um formato diferente (moeda, número...).
    doc.resumo.forEach((item, i) => {
      const fmt = FORMATO_EXCEL[item.formato ?? 'texto'];
      if (fmt) aba.getRow(i + 2).getCell('valor').numFmt = fmt;
    });
  }

  doc.tabelas.forEach((t) => adicionarAba(wb, t.titulo, t.colunas, t.linhas));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// PDF

function desenharCabecalho(pdf: PDFKit.PDFDocument, titulo: string, subtitulo: string) {
  const larguraUtil = pdf.page.width - MARGEM * 2;
  if (fs.existsSync(CAMINHO_LOGO)) pdf.image(CAMINHO_LOGO, MARGEM, MARGEM, { fit: [130, 48] });

  pdf.fillColor(COR_MARCA).fontSize(18).font('Helvetica-Bold')
    .text(titulo, MARGEM + 140, MARGEM + 4, { width: larguraUtil - 140, align: 'right' });
  pdf.fillColor(COR_CINZA).fontSize(9).font('Helvetica')
    .text(subtitulo, MARGEM + 140, MARGEM + 28, { width: larguraUtil - 140, align: 'right' });
  pdf.moveTo(MARGEM, MARGEM + 58).lineTo(pdf.page.width - MARGEM, MARGEM + 58)
    .strokeColor(COR_MARCA).lineWidth(1.5).stroke();

  pdf.y = MARGEM + 72;
}

// Blocos de destaque (rótulo + valor), dois por linha.
function desenharResumo(pdf: PDFKit.PDFDocument, resumo: DocumentoRelatorio['resumo']) {
  const largura = (pdf.page.width - MARGEM * 2) / 2;
  const altura = 42;
  const yInicial = pdf.y;

  resumo.forEach((item, i) => {
    const x = MARGEM + (i % 2) * largura;
    const y = yInicial + Math.floor(i / 2) * (altura + 8);
    pdf.roundedRect(x, y, largura - 10, altura, 6).fillColor('#F5EFEA').fill();
    pdf.fillColor(COR_CINZA).fontSize(8).font('Helvetica').text(item.rotulo.toUpperCase(), x + 12, y + 8);
    pdf.fillColor(COR_MARCA).fontSize(14).font('Helvetica-Bold').text(formatar(item.valor, item.formato), x + 12, y + 20);
  });

  pdf.y = yInicial + Math.ceil(resumo.length / 2) * (altura + 8) + 6;
}

function desenharTabela(pdf: PDFKit.PDFDocument, tabela: Tabela) {
  const larguraUtil = pdf.page.width - MARGEM * 2;
  const somaLarguras = tabela.colunas.reduce((s, c) => s + c.largura, 0);
  const larguras = tabela.colunas.map((c) => (c.largura / somaLarguras) * larguraUtil);
  const alturaLinha = 22;

  if (pdf.y > pdf.page.height - 120) pdf.addPage();
  pdf.fillColor(COR_TEXTO).fontSize(13).font('Helvetica-Bold').text(tabela.titulo, MARGEM, pdf.y);
  pdf.moveDown(0.4);

  // Desenha uma linha da tabela (cabeçalho ou dados) e devolve o y da próxima.
  const desenharLinha = (y: number, textos: string[], cabecalho: boolean, zebra: boolean) => {
    if (cabecalho || zebra) {
      pdf.rect(MARGEM, y, larguraUtil, alturaLinha).fillColor(cabecalho ? COR_MARCA : '#F7F7F7').fill();
    }
    let x = MARGEM;
    textos.forEach((texto, i) => {
      pdf.fillColor(cabecalho ? '#FFFFFF' : COR_TEXTO).fontSize(9).font(cabecalho ? 'Helvetica-Bold' : 'Helvetica')
        .text(texto, x + 6, y + 7, { width: larguras[i] - 12, align: alinhamento(tabela.colunas[i].formato), lineBreak: false, ellipsis: true });
      x += larguras[i];
    });
    return y + alturaLinha;
  };

  const titulos = tabela.colunas.map((c) => c.titulo);
  let y = desenharLinha(pdf.y, titulos, true, false);

  tabela.linhas.forEach((linha, i) => {
    if (y > pdf.page.height - 60) {
      pdf.addPage();
      y = desenharLinha(MARGEM, titulos, true, false);
    }
    const textos = tabela.colunas.map((c) => formatar(linha[c.chave], c.formato));
    y = desenharLinha(y, textos, false, i % 2 === 0);
  });

  pdf.y = y + 14;
}

export function gerarPdf(doc: DocumentoRelatorio): Promise<Buffer> {
  const pdf = new PDFDocument({ size: 'A4', margin: MARGEM });

  desenharCabecalho(pdf, doc.titulo, doc.subtitulo);
  if (doc.resumo.length > 0) desenharResumo(pdf, doc.resumo);
  doc.tabelas.forEach((t) => desenharTabela(pdf, t));

  return new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    pdf.on('data', (p: Buffer) => partes.push(p));
    pdf.on('end', () => resolve(Buffer.concat(partes)));
    pdf.on('error', reject);
    pdf.end();
  });
}
