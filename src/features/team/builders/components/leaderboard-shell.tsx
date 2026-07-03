import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Block, Button, Select } from '@/shared/components';
import type { BuilderPace } from '../services/builders-service';

interface LeaderboardShellProps {
  title: string;
  description: string;
  paceId?: number | null;
  paces?: BuilderPace[];
  loading: boolean;
  error: string | null;
  onPaceChange: (paceId: number) => void;
  onRefresh: () => void;
  children: ReactNode;
}

export function LeaderboardShell({
  title,
  description,
  paceId,
  paces = [],
  loading,
  error,
  onPaceChange,
  onRefresh,
  children,
}: LeaderboardShellProps) {
  return (
    <Block
      title={title}
      description={description}
      titleVariant="h5"
      actions={
        <div className="flex items-center gap-2">
          {paces.length > 0 && (
            <Select
              aria-label="Builder pace"
              className="min-w-[180px]"
              value={paceId ?? ''}
              onChange={(event) => onPaceChange(Number(event.target.value))}
            >
              {paces.map((pace) => (
                <option key={pace.id} value={pace.id}>
                  {pace.name}
                </option>
              ))}
            </Select>
          )}
          <Button type="button" variant="outline" size="icon" title="Refresh" onClick={onRefresh}>
            <RefreshCw size={16} />
          </Button>
        </div>
      }
      className="h-full overflow-hidden"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-white/60">
          Loading leaderboard...
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red-500 dark:text-red-300">{error}</div>
      ) : (
        children
      )}
    </Block>
  );
}
