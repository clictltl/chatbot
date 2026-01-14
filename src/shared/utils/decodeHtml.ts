/**
 * Decodifica entidades HTML (ex: &amp; → &)
 * Útil quando dados vêm escapados do backend.
 */
export function decodeHtml(value: string): string {
  if (!value) return value;

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}
