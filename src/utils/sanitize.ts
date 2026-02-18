/**
 * Sanitize a value before interpolating it into a PostgREST filter string.
 * Strips characters that could alter filter logic: , ( ) . * \
 */
export function sanitizePostgrestValue(value: string): string {
  return value.replace(/[,().*\\]/g, '');
}
