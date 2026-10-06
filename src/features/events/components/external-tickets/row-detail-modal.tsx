import { ErrorState, LoadingState, Modal, Text } from '@shared/components';
import type { AccountMap, ImportRowDetail, MapRole } from '../../types/external-tickets';
import { MapCell } from './shared';

interface RowDetailModalProps {
  open: boolean;
  detail: ImportRowDetail | undefined;
  loading: boolean;
  error: string | null;
  busyMapId: number | null;
  overrides: Record<number, AccountMap>;
  onClose: () => void;
  onQuickConfirm: (map: AccountMap) => void;
  onReview: (map: AccountMap) => void;
}

const ROLES: Array<[MapRole, string]> = [
  ['sponsor', 'Sponsor'],
  ['ticket_holder', 'Original holder'],
  ['transfer_recipient', 'Transfer recipient'],
];

const FIELDS: Array<[string, string]> = [
  ['holder_first_name', 'First name'],
  ['holder_last_name', 'Last name'],
  ['holder_email', 'Email'],
  ['holder_phone', 'Phone'],
  ['holder_user_id', 'Linked account id'],
  ['assignment_status', 'Assignment'],
];

const show = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));

/** Source export vs current WB ticket, the three relationship maps, and history. Loaded on demand. */
export function RowDetailModal(props: RowDetailModalProps) {
  const { open, detail, loading, error, overrides } = props;
  return (
    <Modal open={open} onClose={props.onClose} title={detail ? `Confirmation ${detail.confirmation}` : 'Ticket'} className="max-w-3xl">
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : detail ? (
        <div className="space-y-5 text-sm">
          {detail.ticket?.admission_hold_reason ? (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              On hold: {detail.ticket.admission_hold_reason}
            </p>
          ) : null}
          <section>
            <h3 className="mb-2 font-semibold">Relationships</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {ROLES.map(([role, label]) => {
                const map = detail.maps[role];
                return (
                  <div key={role} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                    <Text variant="muted" className="text-xs uppercase">{label}</Text>
                    <p className="mb-2 font-medium">{map?.source_name || '—'}</p>
                    <MapCell map={map ? overrides[map.id] ?? map : null} busy={props.busyMapId === map?.id} onQuickConfirm={props.onQuickConfirm} onReview={props.onReview} />
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <h3 className="mb-2 font-semibold">
              WB ticket {detail.ticket ? `${detail.ticket.ticket_number}` : '(will be created on apply)'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Field</th>
                    <th className="py-1 pr-3">This export implies</th>
                    <th className="py-1 pr-3">Current in WB</th>
                    <th className="py-1">Last imported</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map(([key, label]) => {
                    const projection = (detail.planned.projection ?? {}) as Record<string, unknown>;
                    const current = detail.ticket?.current[key];
                    const differs = detail.ticket && show(current) !== show(projection[key]);
                    return (
                      <tr key={key} className={`border-t border-slate-100 dark:border-white/5 ${differs ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
                        <td className="py-1 pr-3 text-slate-500">{label}</td>
                        <td className="py-1 pr-3">{show(projection[key])}</td>
                        <td className="py-1 pr-3">{detail.ticket ? show(current) : '—'}</td>
                        <td className="py-1">{detail.ticket ? show(detail.ticket.last_applied[key]) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h3 className="mb-2 font-semibold">Exported values</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {Object.entries(detail.source).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-slate-500">{key.replace(/_/g, ' ')}:</dt>
                  <dd className="break-all">{show(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          {detail.history.length ? (
            <section>
              <h3 className="mb-2 font-semibold">History</h3>
              <ul className="space-y-2">
                {detail.history.map((item) => (
                  <li key={item.id} className="rounded border border-slate-200 p-2 dark:border-white/10">
                    <span className="font-medium capitalize">{item.kind.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500"> · {new Date(item.created_at).toLocaleString()}</span>
                    {item.review_state === 'open' ? <span className="text-amber-700"> · open</span> : null}
                    <p className="text-slate-600 dark:text-slate-300">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
