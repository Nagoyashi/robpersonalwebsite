/** Small build-time formatting helpers. */

/** ISO date -> "20 Jun 2026", or a placeholder dash when unknown. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Relative date for the control center (DESIGN_SPEC §5): "today", "Yesterday",
 * "N days ago" within a week, then "Jun 20" beyond. Null/invalid -> "—".
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
}

/** Human label for a fleet status pill. */
export function statusLabel(status: string, kind: string): string {
  if (kind === 'cli') return 'tool';
  switch (status) {
    case 'live':
      return 'live';
    case 'beta':
      return 'beta';
    case 'building':
      return 'building';
    case 'maintained':
      return 'maintained';
    case 'archived':
      return 'archived';
    default:
      return status;
  }
}
