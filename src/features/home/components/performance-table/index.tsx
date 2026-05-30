import { useQuery } from '@tanstack/react-query';
import { IconInfoCircle } from '@tabler/icons-react';
import { Text } from '@/shared/components/ui/typography';
import { fetchHomePerformanceStats } from '@/features/home/services/home-leaderboard-service';
import './performance-table.css';

function formatValue(value: number | string | undefined): string {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return String(value ?? 0);
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const HEADERS = [
  { label: 'PR/TR', info: 'Personal Recruits / Team Recruits' },
  { label: 'PP/TP', info: 'Personal Points / Team Points' },
  { label: 'LIC', info: 'Licenses this month' },
  { label: 'NL', info: 'Net License' },
  { label: 'TL', info: 'Total Team Licenses' },
  { label: 'BIS', info: 'Butts in Seats' },
  { label: 'BE', info: 'Big Event registrations' },
];

function MetricHeader({ label, info }: { label: string; info: string }) {
  return (
    <div className="performance-table__label">
      <Text weight="bold" className="text-yellow-400">
        {label}
      </Text>
      <span title={info} className="performance-table__info">
        <IconInfoCircle size={15} stroke={2} />
      </span>
    </div>
  );
}

export function PerformanceTable() {
  const userId = localStorage.getItem('wb.userId') || '';
  const { data, error, isLoading } = useQuery({
    queryKey: ['home-performance-stats', userId],
    queryFn: () => fetchHomePerformanceStats(userId),
    enabled: Boolean(userId),
  });
  const values = [
    `${formatValue(data?.current_month_personal_recruits)} / ${formatValue(data?.current_month_team_recruits)}`,
    `${formatValue(data?.current_month_personal_points)} / ${formatValue(data?.current_month_team_points)}`,
    formatValue(data?.current_month_licenses),
    formatValue(data?.net_license_amount),
    formatValue(data?.total_licenses),
    '0',
    formatValue(data?.total_big_event_registrations),
  ];
  const currentMonth = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();

  return (
    <div className="performance-table">
      <div className="performance-table__container">
        <table className="performance-table__table">
          <thead>
            <tr className="performance-table__header-row">
              <th colSpan={4} className="performance-table__header-cell performance-table__header-cell--month">
                <Text weight="bold" className="text-xl tracking-widest text-yellow-400">
                  {currentMonth}
                </Text>
              </th>
              <th colSpan={3} className="performance-table__header-cell">
                <Text weight="bold" className="text-xl tracking-widest text-yellow-400">
                  TOTAL
                </Text>
              </th>
            </tr>
            <tr className="performance-table__subheader-row">
              {HEADERS.map((header, index) => (
                <td
                  key={header.label}
                  className={`performance-table__subheader-cell ${
                    index === 3 ? 'performance-table__subheader-cell--bordered' : ''
                  }`}
                >
                  <MetricHeader {...header} />
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {values.map((value, index) => (
                <td
                  key={HEADERS[index].label}
                  className={`performance-table__cell ${
                    index === 3 ? 'performance-table__cell--bordered' : ''
                  }`}
                >
                  <Text weight="bold" className="performance-table__value">
                    {isLoading ? '...' : value}
                  </Text>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {error && (
          <Text as="div" className="performance-table__error">
            Unable to load performance summary.
          </Text>
        )}
      </div>
    </div>
  );
}
