import { useQuery } from '@tanstack/react-query';
import { IconInfoCircle } from '@tabler/icons-react';
import { Text } from '@/shared/components/ui/typography';
import { Tooltip } from '@/shared/components/ui/tooltip';
import { fetchHomePerformanceStats } from '@/features/home/services/home-leaderboard-service';
import './performance-table.css';
import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { hasRoleAtLeast } from '@core/constants/roles';
import { Plan } from '@core/types';

function formatValue(value: number | string | undefined): string {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return String(value ?? 0);
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
      <Text weight="bold" align="center" className="text-yellow-400">
        {label}
      </Text>
      <Tooltip content={info} position="top" target="hover">
        <span aria-label={info} className="performance-table__info" tabIndex={0}>
          <IconInfoCircle size={15} stroke={2} />
        </span>
      </Tooltip>
    </div>
  );
}

export function PerformanceTable() {
  const userId = localStorage.getItem('wb.userId') || '';
  const { user } = useAuth();
  const canChangeSegment = hasRoleAtLeast(user?.roles ?? [], Plan.Leader);
  const [segment, setSegment] = useState<string | undefined>(canChangeSegment ? 'BASESHOP' : undefined);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const { data, error, isLoading } = useQuery({
    queryKey: ['home-performance-stats', userId, segment, selectedYear, selectedMonth],
    queryFn: () => fetchHomePerformanceStats(userId, segment, selectedYear, selectedMonth),
    enabled: Boolean(userId),
  });
  const values = [
    `${formatValue(data?.current_month_personal_recruits)} / ${formatValue((data?.current_month_team_recruits ?? 0) - (data?.current_month_personal_recruits ?? 0))}`,
    `${formatValue(data?.current_month_personal_points)} / ${formatValue(data?.current_month_team_points)}`,
    formatValue(data?.current_month_licenses),
    formatValue(data?.current_month_net_licensed_count),
    formatValue(data?.total_licenses),
    formatValue(data?.total_butts_in_seat),
    formatValue(data?.total_big_event_registrations),
  ];
  const MONTHS = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    []
  );
  return (
    <div className="performance-table">
      <div className="performance-table__container">
        <table className="performance-table__table">
          <thead>
            <tr className="performance-table__header-row">
              <th colSpan={4} className="performance-table__header-cell performance-table__header-cell--month">
                <div className="performance-table__header-controls">
                  <div className="performance-table__period-controls">
                    <select
                      aria-label="Select month"
                      className="performance-table__date-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Select year"
                      className="performance-table__date-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const y = now.getFullYear() - idx;
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {canChangeSegment && (
                    <div className="performance-table__pill-group" role="tablist" aria-label="Scope selector">
                      <button
                        className={`performance-table__pill-button ${segment === 'BASESHOP' ? 'active' : ''}`}
                        onClick={() => setSegment('BASESHOP')}
                      >
                        Baseshop
                      </button>
                      <button
                        className={`performance-table__pill-button ${segment === 'SUPERBASE' ? 'active' : ''}`}
                        onClick={() => setSegment('SUPERBASE')}
                      >
                        Super base
                      </button>
                      <button
                        className={`performance-table__pill-button ${segment === 'SUPERTEAM' ? 'active' : ''}`}
                        onClick={() => setSegment('SUPERTEAM')}
                      >
                        Super team
                      </button>
                    </div>
                  )}
                </div>
              </th>
              <th colSpan={3} className="performance-table__header-cell">
                <Text weight="bold" align="center" className="text-xl tracking-widest text-yellow-400">
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
                  <Text weight="bold" align="center" className="performance-table__value">
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
