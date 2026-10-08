/** Render a DRF decimal string ("87.50") without trailing zeros ("87.5"). */
export function formatScore(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : value;
}
