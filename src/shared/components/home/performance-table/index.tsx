import { Text } from '@/shared/components/ui/typography';
import './performance-table.css';

interface PerformanceStats {
  nlr: number;
  tr: number;
  pp: number;
  tp: number;
  lic: number;
  nl: number;
  tl: number;
  bis: number;
  be: number;
}

interface PerformanceTableProps {
  stats: PerformanceStats;
  loading?: boolean;
}

export function PerformanceTable({ stats, loading = false }: PerformanceTableProps) {
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
              <td className="performance-table__subheader-cell">
                <Text weight="bold" className="text-yellow-400">
                  PR/TR
                </Text>
              </td>
              <td className="performance-table__subheader-cell">
                <Text weight="bold" className="text-yellow-400">
                  PP/TP
                </Text>
              </td>
              <td className="performance-table__subheader-cell">
                <Text weight="bold" className="text-yellow-400">
                  LIC
                </Text>
              </td>
              <td className="performance-table__subheader-cell performance-table__subheader-cell--bordered">
                <Text weight="bold" className="text-yellow-400">
                  NL
                </Text>
              </td>
              <td className="performance-table__subheader-cell">
                <Text weight="bold" className="text-yellow-400">
                  TL
                </Text>
              </td>
              <td className="performance-table__subheader-cell">
                <Text weight="bold" className="text-yellow-400">
                  BIS
                </Text>
              </td>
              <td className="performance-table__subheader-cell">
                <Text weight="bold" className="text-yellow-400">
                  BE
                </Text>
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="performance-table__cell">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : `${stats.nlr} / ${stats.tr}`}
                </Text>
              </td>
              <td className="performance-table__cell">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : `${stats.pp} / ${stats.tp}`}
                </Text>
              </td>
              <td className="performance-table__cell">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : stats.lic}
                </Text>
              </td>
              <td className="performance-table__cell performance-table__cell--bordered">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : stats.nl}
                </Text>
              </td>
              <td className="performance-table__cell">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : stats.tl}
                </Text>
              </td>
              <td className="performance-table__cell">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : stats.bis}
                </Text>
              </td>
              <td className="performance-table__cell">
                <Text weight="bold" className="performance-table__value">
                  {loading ? '...' : stats.be}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
