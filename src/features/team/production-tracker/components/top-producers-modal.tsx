import { Modal } from '@/shared/components';
import type { ProductionTopPerformer } from '../services/production-tracker-service';

export function TopProducersModal({
  open,
  performers,
  onClose,
}: {
  open: boolean;
  performers: ProductionTopPerformer[];
  onClose: () => void;
}) {
  const top10 = performers.slice(0, 10);

  return (
    <Modal
      open={open}
      title="🏆 Top Producers"
      onClose={onClose}
      contentClassName="max-w-[480px]"
    >
      {top10.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500 dark:text-white/50">No data available.</p>
      ) : (
        <ol className="space-y-2">
          {top10.map((performer, index) => (
            <li
              key={performer.user_id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-white/10 dark:bg-white/5"
            >
              <span className="w-6 text-center text-xs font-bold text-[#f4c95d]">{index + 1}</span>
              <span className="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{performer.user_name}</span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}