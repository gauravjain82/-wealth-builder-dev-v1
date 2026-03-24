import type { TrackerTableColumn } from '@/shared/components';
import type { Prospect } from '../services/prospect-service';
import { buildProfileSummary } from './prospect-utils';

export function buildProspectColumns(
  onEdit: (row: Prospect) => void,
  onOpenCallLog: (row: Prospect) => void,
  onDelete: (row: Prospect) => void
): TrackerTableColumn<Prospect>[] {
  return [
    {
      key: 'mark',
      label: '',
      width: 48,
      align: 'center',
      sortable: false,
      render: (row) => {
        const mark = row.prospect_meta?.mark || '';
        const bg =
          mark === 'Both'
            ? '#a855f7'
            : mark === 'Client'
            ? '#22c55e'
            : mark === 'Recruit'
            ? '#3b82f6'
            : '#64748b';
        return (
          <span
            title={mark || 'No mark'}
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: bg,
            }}
          />
        );
      },
    },
    {
      key: 'leader_name',
      label: 'Leader',
      width: 180,
      sortable: true,
      render: (row) => row.leader_name || '-',
      searchable: true,
      searchPlaceholder: 'Search Leader',
    },
    {
      key: 'recruited_by_name',
      label: 'Recruiter Name',
      width: 180,
      sortable: true,
      render: (row) => row.recruited_by_name || '-',
      searchable: true,
      searchPlaceholder: 'Search Recruiter',
    },
    {
      key: 'full_name',
      label: 'Name',
      width: 240,
      sticky: true,
      sortable: true,
      searchable: true,
      searchPlaceholder: 'Search Name',
    },
    {
      key: 'top25',
      label: 'Top 25',
      width: 90,
      align: 'center',
      sortable: true,
      render: (row) => <span style={{ fontSize: '1.2em' }}>{row.prospect_meta?.top25 ? '⭐' : ''}</span>,
    },
    {
      key: 'hot',
      label: 'HOT',
      width: 80,
      align: 'center',
      sortable: true,
      render: (row) => <span style={{ fontSize: '1.2em' }}>{row.prospect_meta?.hot ? '🔥' : ''}</span>,
    },
    {
      key: 'outcome',
      label: 'Outcome',
      width: 150,
      sortable: true,
      render: (row) => row.prospect_meta?.outcome || '-',
    },
    {
      key: 'profile',
      label: 'Profile',
      width: 320,
      sortable: true,
      render: (row) => buildProfileSummary(row),
      value: (row) => buildProfileSummary(row),
    },
    {
      key: 'notes',
      label: 'Notes',
      width: 360,
      render: (row) => {
        const notes = row.prospect_meta?.notes || '';
        return notes.length > 50 ? notes.substring(0, 50) + '...' : notes || '-';
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 150,
      align: 'center',
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            title="Edit prospect"
            aria-label={`Edit ${row.full_name || row.email}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            className="h-7 w-7 rounded border border-amber-300/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          >
            ✎
          </button>
          <button
            type="button"
            title="Invite prospect"
            aria-label={`Invite ${row.full_name || row.email}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCallLog(row);
            }}
            className="h-7 w-7 rounded border border-blue-300/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
          >
            ✉
          </button>
          <button
            type="button"
            title="Delete prospect"
            aria-label={`Delete ${row.full_name || row.email}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            className="h-7 w-7 rounded border border-red-300/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            🗑
          </button>
        </div>
      ),
    },
  ];
}
