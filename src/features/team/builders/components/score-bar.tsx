export function ScoreBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
      </div>
      <div className="w-12 text-right text-sm font-bold text-amber-600 dark:text-amber-300">
        {Math.round(value)}
      </div>
    </div>
  );
}
