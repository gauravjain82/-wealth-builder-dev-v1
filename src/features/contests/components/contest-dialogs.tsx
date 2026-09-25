/**
 * Proof, profile, flyer and Help — all four through the shared `Modal`.
 *
 * `Modal` renders with `createPortal` to `document.body`, which is the whole point:
 * the contest card sets `overflow: hidden` so its body can scroll internally, and a
 * dialog rendered inside that element would be clipped by it. Nothing here builds its
 * own overlay layer — `UI_CONTRACT.md` asks for host-native portals and the host has
 * one.
 *
 * Each dialog opens immediately with a loading state and fetches its own data; the
 * hooks are `enabled`-gated on being open, so opening the card does not fetch four
 * dialogs' worth of data nobody asked for.
 */

import { Modal } from '@/shared/components/ui/modal';

import { useAgentProfile, useFlyer, useProof } from '../hooks/use-contests';
import type { ProfileResponse, ProofResponse, ThresholdMetric } from '../types';

/* --- proof ---------------------------------------------------------------- */

export interface ProofTarget {
  contestId: number;
  tierId: number;
  agentId: number;
  agentName: string;
  tierName: string;
  metric: ThresholdMetric;
}

interface ProofDialogProps {
  target: ProofTarget | null;
  onClose: () => void;
  onOpenAgent: (agentId: number, name: string) => void;
}

/** Cell values may be dates, numbers or masked strings; render them safely. */
function renderCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
}

export function ProofDialog({ target, onClose, onOpenAgent }: ProofDialogProps) {
  const { data, isLoading, isError, error } = useProof(
    target
      ? {
          contestId: target.contestId,
          tierId: target.tierId,
          agentId: target.agentId,
          metric: target.metric,
        }
      : null
  );

  return (
    <Modal
      open={target !== null}
      title={target ? `${target.metric.toUpperCase()} — ${target.agentName}` : ''}
      onClose={onClose}
    >
      <div className="wb-ct-dialog">
        {isLoading ? <p>Loading the detail behind this number…</p> : null}
        {isError ? <p role="alert">{(error as Error)?.message}</p> : null}
        {data ? <ProofBody proof={data} onOpenAgent={onOpenAgent} /> : null}
      </div>
    </Modal>
  );
}

function ProofBody({
  proof,
  onOpenAgent,
}: {
  proof: ProofResponse;
  onOpenAgent: (agentId: number, name: string) => void;
}) {
  if (!proof.available) {
    // Never a table of zero rows: a zero would claim nobody reached it, which is a
    // different statement from "this cannot be measured here".
    return (
      <>
        <p>
          <strong>{proof.label}</strong> cannot be measured in this system.
        </p>
        <p>{proof.message}</p>
      </>
    );
  }

  return (
    <>
      <p className="wb-ct-tier-period">{proof.period.label}</p>
      {proof.team_credit_note ? (
        <p className="wb-ct-note">{proof.team_credit_note}</p>
      ) : null}

      <dl className="wb-ct-dialog-cards">
        {proof.cards.map((card) => (
          <div className="wb-ct-dialog-card" key={card.label}>
            <dt>{card.label}</dt>
            <dd>{renderCell(card.value)}</dd>
          </div>
        ))}
        {proof.requirement !== null ? (
          <div className="wb-ct-dialog-card">
            <dt>Goal</dt>
            <dd>{proof.requirement}</dd>
          </div>
        ) : null}
      </dl>

      <p>{proof.formula}</p>

      {proof.rows.length ? (
        <table>
          <thead>
            <tr>
              {proof.columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proof.rows.map((row, index) => (
              <tr key={index}>
                {proof.columns.map((column) => {
                  const value = row[column.key];
                  const agentId = row.agent_id;
                  const isAgentLink =
                    column.key.endsWith('_name') && typeof agentId === 'number';
                  return (
                    <td key={column.key}>
                      {isAgentLink ? (
                        <button
                          type="button"
                          className="wb-ct-agent-link"
                          onClick={() => onOpenAgent(agentId as number, renderCell(value))}
                        >
                          {renderCell(value)}
                        </button>
                      ) : (
                        renderCell(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No source rows in this period.</p>
      )}

      {proof.next_cursor ? (
        <p className="wb-ct-tier-period">
          Showing {proof.rows.length} of {proof.total_rows} rows.
        </p>
      ) : null}
    </>
  );
}

/* --- profile -------------------------------------------------------------- */

interface ProfileDialogProps {
  target: { contestId: number; agentId: number; name: string } | null;
  onClose: () => void;
}

export function ProfileDialog({ target, onClose }: ProfileDialogProps) {
  const { data, isLoading, isError, error } = useAgentProfile(
    target ? { contestId: target.contestId, agentId: target.agentId } : null
  );

  return (
    <Modal open={target !== null} title={target?.name ?? ''} onClose={onClose}>
      <div className="wb-ct-dialog">
        {isLoading ? <p>Loading profile…</p> : null}
        {isError ? <p role="alert">{(error as Error)?.message}</p> : null}
        {data ? <ProfileBody profile={data} /> : null}
      </div>
    </Modal>
  );
}

function ProfileBody({ profile }: { profile: ProfileResponse }) {
  const fields: Array<[string, string]> = [
    ['Agent code', profile.agency_code || '—'],
    ['Level', profile.level || 'No level'],
    ['Status', profile.is_active ? 'Active' : 'Inactive'],
    ['Licensed', profile.is_licensed ? 'Yes' : 'No'],
    ['Recruiter', profile.recruiter?.name || '—'],
    ['Leader', profile.leader?.name || '—'],
  ];

  return (
    <>
      <dl className="wb-ct-dialog-cards">
        {fields.map(([label, value]) => (
          <div className="wb-ct-dialog-card" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h4>Recruiting path</h4>
        <p>{profile.recruiting_path.map((node) => node.name || node.agency_code).join(' → ')}</p>
      </div>

      {profile.leader_path.length ? (
        <div>
          <h4>Reporting path</h4>
          <p>{profile.leader_path.map((node) => node.name || node.agency_code).join(' → ')}</p>
        </div>
      ) : null}
    </>
  );
}

/* --- flyer ---------------------------------------------------------------- */

interface FlyerDialogProps {
  contestId: number | null;
  contestName: string;
  onClose: () => void;
}

export function FlyerDialog({ contestId, contestName, onClose }: FlyerDialogProps) {
  const { data, isLoading, isError } = useFlyer(contestId);

  return (
    <Modal open={contestId !== null} title={`${contestName} flyer`} onClose={onClose}>
      <div className="wb-ct-dialog">
        {isLoading ? <p>Loading flyer…</p> : null}
        {isError ? <p role="alert">This flyer is not available.</p> : null}
        {data ? (
          <>
            {data.kind === 'image' ? (
              <img className="wb-ct-flyer-image" src={data.url} alt={`${contestName} flyer`} />
            ) : (
              <iframe className="wb-ct-flyer-frame" src={data.url} title={`${contestName} flyer`} />
            )}
            {/* An accessible alternative, because an embedded PDF viewer is not
                guaranteed and a signed URL expires. */}
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              Open {data.original_name || 'the flyer'} in a new tab
            </a>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

/* --- help ----------------------------------------------------------------- */

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="How contest standings work" onClose={onClose}>
      <div className="wb-ct-dialog">
        <p>
          <strong>Progress</strong> is the average of your progress on each requirement,
          with every requirement capped at 100%. Going far past one requirement does not
          make up for falling short on another.
        </p>
        <p>
          <strong>Qualifying</strong> needs every requirement met. A tier can show 100%
          progress without being qualified, because the cap can hide a shortfall
          elsewhere.
        </p>
        <p>
          <strong>A blank cell</strong> means that tier is not open to you — for example
          a Non-License tier when you are licensed. It is not a score of zero.
        </p>
        <p>
          <strong>Tier cards</strong> are toggles. With none selected you see them all;
          selecting some shows only those; turning the last one off returns to all.
        </p>
        <p>
          <strong>Sorting</strong> uses the exact value, and people who are not eligible
          for the sorted tier always come last, in either direction.
        </p>
        <p>
          <strong>Filters</strong> do nothing until you press Apply.
        </p>
        <p>
          Some requirements cannot be measured in this system. They are shown as
          unavailable rather than as zero, because zero would claim nobody reached them.
        </p>
      </div>
    </Modal>
  );
}
