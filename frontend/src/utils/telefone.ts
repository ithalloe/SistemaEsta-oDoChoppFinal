// Utilitários de telefone.
// Regra: no banco guardamos apenas os dígitos (ex: "43999991234").
// A máscara "(43) 99999-1234" é usada apenas na exibição/digitação.

/** Remove tudo que não for dígito. Ex: "(43) 99999-1234" -> "43999991234" */
export function apenasDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

/** Aplica a máscara de telefone sobre uma string de dígitos (ou já formatada). */
export function formatarTelefone(valor: string): string {
  const numeros = apenasDigitos(valor).slice(0, 11);
  if (numeros.length === 0) return '';
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}
