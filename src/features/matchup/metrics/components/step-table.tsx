import type { MetricsSection, StepCounts, StepMeta } from '../types';
import { percent } from './format';

interface StepTableProps {
  steps: StepMeta[];
  counts: Record<string, StepCounts>;
  section: MetricsSection;
}

/** Booked vs. what happened, per step; the outcome columns add up to Booked. */
export function StepTable({ steps, counts, section }: StepTableProps) {
  const trainerColumns = section === 'REQUEST_TRAINER';
  return (
    <div className="mm-table-wrap">
      <table className="mm-table">
        <thead>
          <tr>
            <th>Step</th>
            <th>Booked</th>
            <th>Showed up</th>
            <th>Show rate</th>
            <th>No-show</th>
            <th>Form pending</th>
            {trainerColumns && <th>Not accepted</th>}
            {trainerColumns && <th>No trainer</th>}
            <th>Upcoming</th>
            <th>Cancelled</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => {
            const row = counts[step.key];
            if (!row) return null;
            return (
              <tr key={step.key}>
                <td>
                  {step.label}
                  {step.historical && <em className="mm-tag">historical</em>}
                </td>
                <td>{row.booked}</td>
                <td>{row.showed}</td>
                <td>{percent(row.showed, row.booked - row.upcoming)}</td>
                <td>{row.no_show}</td>
                <td>{row.result_pending}</td>
                {trainerColumns && <td>{row.not_accepted}</td>}
                {trainerColumns && <td>{row.no_trainer}</td>}
                <td>{row.upcoming}</td>
                <td>{row.cancelled}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
