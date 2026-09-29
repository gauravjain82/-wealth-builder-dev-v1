/**
 * Proof, profile, flyer and Help — all four through the shared `Modal`, laid out as
 * dtez's (`wb_contests.php` `proof`, `detailTable`, `openProfile`, `pathMarkup`,
 * `openFlyer`; parity phase 20).
 *
 * `Modal` renders with `createPortal` to `document.body`, which is the whole point:
 * the contest card sets `overflow: hidden` so its body can scroll internally, and a
 * dialog rendered inside that element would be clipped by it. Nothing here builds its
 * own overlay layer — `docs/contests/UI.md` §2.6 asks for host-native portals and the host has
 * one. All four are `dismissible`: Escape closes the top one, and a click on its
 * backdrop closes it, as on dtez.
 *
 * Each dialog opens immediately with a loading state and fetches its own data; the
 * hooks are `enabled`-gated on being open, so opening the card does not fetch four
 * dialogs' worth of data nobody asked for.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Modal } from '@/shared/components/ui/modal';

import { useAgentProfile, useFlyer, useProof } from '../hooks/use-contests';
import type {
  ProfilePathNode,
  ProfileResponse,
  ProfileTarget,
  ProofColumn,
  ProofResponse,
  ProofTarget,
} from '../types';
import { formatAmount } from './contest-format';

/** Every dialog here: dtez's dark palette and backdrop, in both placements. */
const DIALOG_CLASS = 'wb-ct-modal';
const BACKDROP_CLASS = 'wb-ct-modal-backdrop';

/* --- proof ---------------------------------------------------------------- */

interface ProofDialogProps {
  target: ProofTarget | null;
  onClose: () => void;
  onOpenAgent: (agentId: number, name: string) => void;
}

/** The per-policy points columns, right-aligned and shown as whole numbers. */
const POINT_KEYS = new Set([
  'first_advance',
  'second_advance',
  'other_advance',
  'chargebacks',
  'net_points',
]);

/** Columns holding a person, with `<key>_id` and `<key>_code` beside them on the row. */
const PERSON_KEYS = new Set(['person', 'owner']);

/** Cell values may be dates, numbers or masked strings; an absent key renders `—`. */
function renderCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
}

/** dtez's `fmt`, keeping the sign: a chargeback reads `-100`, a subtraction. */
function renderPoints(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric < 0 ? `-${formatAmount(Math.abs(numeric))}` : formatAmount(numeric);
}

/** `2026-07-01 to 2026-12-31`, as dtez's subtitle. */
function periodText(proof: ProofResponse | undefined, fallback: string): string {
  return proof ? `${proof.period.start} to ${proof.period.end}` : fallback;
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
  const [showDeveloper, setShowDeveloper] = useState(false);
  const targetKey = target ? `${target.agentId}:${target.tierId}:${target.metric}` : '';
  // A new proof starts with the developer panel closed, as dtez's `resetDerivation`.
  useEffect(() => setShowDeveloper(false), [targetKey]);

  // The key is absent unless the server decided this viewer holds wbreporting:manage.
  const hasDeveloper = data !== undefined && 'sql' in data;

  return (
    <Modal
      open={target !== null}
      dismissible
      title={target ? `${target.agentName} · ${target.metric.toUpperCase()}` : ''}
      subtitle={target ? periodText(data, target.periodLabel) : null}
      titleClassName="wb-ct-modal-title"
      className={BACKDROP_CLASS}
      contentClassName={DIALOG_CLASS}
      headerActions={
        hasDeveloper ? (
          <button
            type="button"
            className="wb-ct-derivation-toggle"
            title="Show developer derivation"
            aria-label="Show developer derivation"
            aria-expanded={showDeveloper}
            onClick={() => setShowDeveloper((open) => !open)}
          >
            {'{ }'}
          </button>
        ) : null
      }
      onClose={onClose}
    >
      <div className="wb-ct-dialog">
        {isLoading ? <p className="wb-ct-empty">Loading proof records…</p> : null}
        {isError ? (
          <p className="wb-ct-empty" role="alert">
            {(error as Error)?.message}
          </p>
        ) : null}
        {data ? <ProofBody proof={data} onOpenAgent={onOpenAgent} /> : null}
        {data && hasDeveloper && showDeveloper ? <DeveloperPanel proof={data} /> : null}
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
    // different statement from "this cannot be measured here" (C15).
    return (
      <div className="wb-ct-empty">
        <p>
          <strong>{proof.label}</strong> cannot be measured in this system.
        </p>
        <p>{proof.message || 'Proof detail is not connected for this metric yet.'}</p>
      </div>
    );
  }

  const label = proof.metric.toUpperCase();
  return (
    <>
      {/* C5: the single-hop note stays the proof's first line. */}
      {proof.team_credit_note ? (
        <p className="wb-ct-note">{proof.team_credit_note}</p>
      ) : null}

      {proof.source_total !== undefined && proof.source_total !== null ? (
        <div className="wb-ct-proof-summary">
          {label} source total: <strong>{formatAmount(proof.source_total)}</strong>
          {proof.truncated
            ? ` · first ${proof.rows.length.toLocaleString('en-US')} records shown`
            : ''}
          {proof.detail_visibility ? (
            <div className="wb-ct-meta-line">
              Client and policy detail: {proof.detail_visibility}
            </div>
          ) : null}
        </div>
      ) : null}

      <dl className="wb-ct-dialog-cards">
        {proof.cards.map((card) => (
          <div className="wb-ct-dialog-card" key={card.label}>
            <dt>{card.label}</dt>
            <dd>{typeof card.value === 'number' ? renderPoints(card.value) : renderCell(card.value)}</dd>
          </div>
        ))}
        {proof.requirement !== null ? (
          <div className="wb-ct-dialog-card">
            <dt>Goal</dt>
            <dd>{formatAmount(proof.requirement)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="wb-ct-proof-formula">{proof.formula}</p>

      {proof.rows.length ? (
        <div className="wb-ct-proof-wrap">
          <table className="wb-ct-proof-table">
            <thead>
              <tr>
                {proof.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={POINT_KEYS.has(column.key) ? 'wb-ct-num' : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proof.rows.map((row, index) => (
                <tr key={index}>
                  {proof.columns.map((column) => (
                    <td
                      key={column.key}
                      className={POINT_KEYS.has(column.key) ? 'wb-ct-num' : undefined}
                    >
                      <ProofCell
                        column={column}
                        columns={proof.columns}
                        row={row}
                        onOpenAgent={onOpenAgent}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="wb-ct-empty">No source records were found.</p>
      )}
    </>
  );
}

function ProofCell({
  column,
  columns,
  row,
  onOpenAgent,
}: {
  column: ProofColumn;
  columns: ProofColumn[];
  row: Record<string, unknown>;
  onOpenAgent: (agentId: number, name: string) => void;
}): ReactNode {
  const value = row[column.key];
  if (POINT_KEYS.has(column.key)) return renderPoints(value);
  if (!PERSON_KEYS.has(column.key)) return renderCell(value);

  // A person: their name opens their profile over this proof. dtez's events table puts
  // the code under the name; the recruits table has its own code column instead.
  const id = row[`${column.key}_id`];
  const code = row[`${column.key}_code`];
  const name = renderCell(value);
  const codeBelow =
    typeof code === 'string' && code && !columns.some((c) => c.key === `${column.key}_code`);
  return (
    <>
      {typeof id === 'number' ? (
        <button type="button" className="wb-ct-person" onClick={() => onOpenAgent(id, name)}>
          {name}
        </button>
      ) : (
        name
      )}
      {codeBelow ? <div className="wb-ct-meta-line">{code}</div> : null}
    </>
  );
}

/** dtez's "Developer derivation": source SQL, parameters, the API JSON, and Copy. */
function DeveloperPanel({ proof }: { proof: ProofResponse }) {
  const sql = proof.sql || 'No source SQL is available for this calculated metric.';
  const params = JSON.stringify(proof.sql_params ?? {}, null, 2);
  const json = JSON.stringify(proof, null, 2);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'blocked'>('idle');
  const panel = useRef<HTMLElement>(null);
  useEffect(() => panel.current?.scrollIntoView({ block: 'nearest' }), []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `SOURCE SQL\n\n${sql}\n\nSQL PARAMETERS\n\n${params}\n\nAPI JSON\n\n${json}`
      );
      setCopy('copied');
      window.setTimeout(() => setCopy('idle'), 1200);
    } catch {
      setCopy('blocked');
    }
  };

  return (
    <section ref={panel} className="wb-ct-derivation" aria-label="Developer derivation">
      {copy === 'blocked' ? (
        <p className="wb-ct-empty">Copy was blocked by this browser.</p>
      ) : null}
      <h4>Developer derivation</h4>
      <button type="button" className="wb-ct-derivation-copy" onClick={() => void onCopy()}>
        {copy === 'copied' ? 'Copied' : 'Copy SQL + JSON'}
      </button>
      <h4>Source SQL</h4>
      <pre>{sql}</pre>
      <h4>SQL parameters</h4>
      <pre>{params}</pre>
      <h4>API JSON</h4>
      <pre>{json}</pre>
    </section>
  );
}

/* --- profile -------------------------------------------------------------- */

interface ProfileDialogProps {
  target: ProfileTarget | null;
  onClose: () => void;
}

/** dtez's `personLabel`: `Name [CODE]`. */
function nodeLabel(node: ProfilePathNode | null): string {
  if (!node) return '-';
  const name = node.name || node.agency_code;
  return node.agency_code ? `${name} [${node.agency_code}]` : name || '-';
}

export function ProfileDialog({ target, onClose }: ProfileDialogProps) {
  const { data, isLoading, isError, error } = useAgentProfile(
    target ? { contestId: target.contestId, agentId: target.agentId } : null
  );

  // "07VIR · SMD". A hidden level is absent and left out; "" is a person with none.
  const subtitle = data
    ? [
        data.agency_code || 'No agent code',
        data.level === undefined ? null : data.level || 'No level',
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <Modal
      open={target !== null}
      dismissible
      title={data?.name || target?.name || 'Agent profile'}
      subtitle={subtitle}
      titleClassName="wb-ct-modal-title"
      className={BACKDROP_CLASS}
      contentClassName={DIALOG_CLASS}
      onClose={onClose}
    >
      <div className="wb-ct-dialog">
        {isLoading ? <p className="wb-ct-empty">Loading profile…</p> : null}
        {isError ? (
          <p className="wb-ct-empty" role="alert">
            {(error as Error)?.message}
          </p>
        ) : null}
        {data ? <ProfileBody profile={data} /> : null}
      </div>
    </Modal>
  );
}

function ProfileBody({ profile }: { profile: ProfileResponse }) {
  const fields: Array<[string, string]> = [
    ...(profile.level === undefined
      ? []
      : ([['Agency level', profile.level || '-']] as Array<[string, string]>)),
    ['Status', profile.is_active ? 'Active' : 'Inactive'],
    ['License status', profile.is_licensed ? 'Licensed' : 'Not licensed'],
    ['Agent code', profile.agency_code || '-'],
    ['Recruiter', nodeLabel(profile.recruiter)],
    ['Assigned leader', nodeLabel(profile.leader)],
    ['Hierarchy record', String(profile.agent_id)],
  ];

  return (
    <>
      <dl className="wb-ct-profile-grid">
        {fields.map(([label, value]) => (
          <div className="wb-ct-profile-item" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <PathDiagram
        label="Recruiting connection, agent to highest known upline"
        path={profile.recruiting_path}
      />
      <PathDiagram label="Reporting leader connection" path={profile.leader_path} />
    </>
  );
}

/** dtez's `pathMarkup`: one box per person, name over code, joined by arrows. */
function PathDiagram({ label, path }: { label: string; path: ProfilePathNode[] }) {
  return (
    <section className="wb-ct-profile-item wb-ct-path-section" aria-label={label}>
      <h4>{label}</h4>
      {path.length ? (
        <ol className="wb-ct-path">
          {path.map((node, index) => (
            <li key={`${node.agent_id}-${index}`} className="wb-ct-path-step">
              {index ? (
                <span className="wb-ct-path-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
              <span className="wb-ct-path-node">
                <strong>{node.name || node.agency_code || '-'}</strong>
                <span className="wb-ct-meta-line">{node.agency_code || '-'}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="wb-ct-meta-line">No hierarchy path found.</p>
      )}
    </section>
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
    <Modal
      open={contestId !== null}
      dismissible
      title={`${contestName} Flyer`}
      titleClassName="wb-ct-modal-title"
      className={BACKDROP_CLASS}
      contentClassName={DIALOG_CLASS}
      onClose={onClose}
    >
      <div className="wb-ct-dialog">
        {isLoading ? <p className="wb-ct-empty">Loading flyer…</p> : null}
        {isError ? (
          <p className="wb-ct-empty" role="alert">
            This flyer is not available.
          </p>
        ) : null}
        {data ? (
          <>
            {data.kind === 'image' ? (
              <img
                className="wb-ct-flyer-image"
                src={data.url}
                alt={`${contestName} contest flyer`}
              />
            ) : (
              <iframe
                className="wb-ct-flyer-frame"
                src={data.url}
                title={`${contestName} contest flyer`}
              />
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

/**
 * dtez's help (`#helpModal`, Appendix B), rewritten for this page: our view names,
 * "Direct reports only" where dtez says "Net" (C10; C27 open), Apply, and the parts of
 * our scoring dtez does not have to explain — whole-number rounding and sourceless
 * requirements (C15, C20).
 */
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      dismissible
      title="How to Use Contest Results"
      titleClassName="wb-ct-modal-title"
      className={BACKDROP_CLASS}
      contentClassName={DIALOG_CLASS}
      onClose={onClose}
    >
      <div className="wb-ct-dialog wb-ct-help">
        <p>
          Choose a contest at the top, then narrow the people shown with Person and View and
          press Apply. On a phone, the tier cards form a horizontal selector: tap one or more
          tiers to show only those columns; tap every selected tier off to return to all
          tiers.
        </p>
        <h4>Progress and qualification</h4>
        <p>
          The displayed percentage is the average progress across the tier&rsquo;s required
          metrics. Each metric is capped at 100% in that average, so exceeding one goal cannot
          compensate for a missing goal. A person is qualified only when every required metric
          reaches 100%. Percentages are rounded to whole numbers, so a tier at 99.6% shows
          100% and is still not qualified.
        </p>
        <p>
          Yellow means the person has reached the configured almost-there threshold; green
          means fully qualified. A blank cell means the person is not eligible for that tier,
          including licensed people in a Non-License tier — it is not a score of zero. A
          requirement this system has no data for yet counts as 0, and its pill says so.
        </p>
        <h4>Sorting and details</h4>
        <p>
          Click a tier heading above the results to sort that tier highest-to-lowest; click it
          again for lowest-to-highest. People not eligible for it always come last. Click a
          person&rsquo;s name for license, level, recruiter, leader, and hierarchy paths.
          Click any metric pill to inspect the source records used for that number; a name in
          those records opens that person&rsquo;s profile on top. Client and policy visibility
          follows the administrator&rsquo;s relationship-based privacy settings.
        </p>
        <h4>Views</h4>
        <p>
          Everyone I can see is everyone your access allows. Just this person shows one
          person. Base shop, SMD base, Super base, and Super team follow recruiting
          relationships at their defined depths. Direct reports only keeps the selected person
          and the people who name them as their leader. Leaders and Agents can be included
          independently. Upline and Leader move the selected person to those related
          accounts.
        </p>
        <h4>Contest flyer</h4>
        <p>
          When a manager publishes a flyer, an image icon appears beside the contest title.
          Select it to view the image or PDF without leaving the standings.
        </p>
      </div>
    </Modal>
  );
}
