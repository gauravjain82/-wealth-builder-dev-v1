import { TrackerTable, type TrackerTableColumn } from '@/shared/components';

interface TeamTrackerRow {
  id: string;
  name: string;
  status: 'Active' | 'Pending' | 'Prospect';
  licensed: 'Yes' | 'No';
  points: number;
  recruits: number;
  production: number;
}

const TEAM_ROWS: TeamTrackerRow[] = [
  {
    id: 'T-001',
    name: 'Roopesh Kumar',
    status: 'Active',
    licensed: 'Yes',
    points: 114,
    recruits: 6,
    production: 48200,
  },
  {
    id: 'T-002',
    name: 'Sonia Patel',
    status: 'Pending',
    licensed: 'No',
    points: 74,
    recruits: 3,
    production: 23900,
  },
  {
    id: 'T-003',
    name: 'Arjun Mehta',
    status: 'Prospect',
    licensed: 'No',
    points: 32,
    recruits: 1,
    production: 8800,
  },
];

const TEAM_COLUMNS: TrackerTableColumn<TeamTrackerRow>[] = [
  {
    key: 'name',
    label: 'Team Member',
    width: 240,
    sticky: true,
    sortable: true,
    align: 'left',
  },
  {
    key: 'status',
    label: 'Status',
    width: 130,
    sortable: true,
  },
  {
    key: 'licensed',
    label: 'Licensed',
    width: 120,
    sortable: true,
  },
  {
    key: 'points',
    label: 'Points',
    width: 120,
    sortable: true,
    align: 'right',
  },
  {
    key: 'recruits',
    label: 'Recruits',
    width: 120,
    sortable: true,
    align: 'right',
  },
  {
    key: 'production',
    label: 'Production',
    width: 160,
    sortable: true,
    align: 'right',
    render: (row) => `$${row.production.toLocaleString()}`,
    value: (row) => row.production,
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-muted-foreground">
          View and manage your team members with the reusable tracker table.
        </p>
      </div>

      <div>
        <TrackerTable
          columns={TEAM_COLUMNS}
          rows={TEAM_ROWS}
          rowKey={(row) => row.id}
          stickyFirstColumn
          defaultSort={{ key: 'points', direction: 'desc' }}
          emptyMessage="No team members yet. Start building your network!"
        />
      </div>
    </div>
  );
}
