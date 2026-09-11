const COLOR_MAP: Record<string, string> = {
  // Customer status
  LEAD: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  INACTIVE: 'bg-slate-100 text-slate-600',
  // Challan status
  DRAFT: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-700',
  // Movement type
  IN: 'bg-emerald-100 text-emerald-800',
  OUT: 'bg-orange-100 text-orange-800',
};

export function StatusBadge({ status }: { status: string }) {
  const classes = COLOR_MAP[status] ?? 'bg-slate-100 text-slate-700';
  return <span className={`badge ${classes}`}>{status}</span>;
}
