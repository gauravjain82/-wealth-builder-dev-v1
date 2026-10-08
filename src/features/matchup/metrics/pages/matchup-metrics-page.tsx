import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { useToastStore } from '@/store';
import { Button } from '@shared/components/ui';
import { AppointmentDetailsModal } from '../../components/appointment-details-modal';
import { matchupService } from '../../services/matchup-service';
import type { AppointmentDetail } from '../../types';
import { AttentionStrip } from '../components/attention-strip';
import { FunnelStrip } from '../components/funnel-strip';
import { formatWindow } from '../components/format';
import { type Comparison, OutcomeHero } from '../components/outcome-hero';
import { ProspectJourneyView } from '../components/prospect-journey';
import { type RowSort, RowsTable } from '../components/rows-table';
import { StepBars } from '../components/step-bars';
import { StepTable } from '../components/step-table';
import {
  type DrillPath,
  useMatchupMetricsAccess,
  previousWindow,
  useMetricsReport,
  usePreviousReport,
  useProspectJourney,
} from '../hooks/use-matchup-metrics';
import type {
  CountMode,
  JourneyAppointment,
  MetricsQuery,
  MetricsRow,
  MetricsSection,
  Segment,
} from '../types';
import './matchup-metrics-page.css';

const DEFAULT_DAYS = 60;
const SECTIONS: { key: MetricsSection; label: string }[] = [
  { key: 'REQUEST_TRAINER', label: 'Trainer requests' },
  { key: 'PERSONAL', label: 'Personal appointments' },
];
const SEGMENT_LABELS: Record<Segment, string> = {
  BASESHOP: 'BaseShop',
  SUPERBASE: 'SuperBase',
  SUPERTEAM: 'SuperTeam',
};
const ROW_TITLES = { smd: 'SMD', agent: 'Agent', prospect: 'Prospect' } as const;

function isoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - DEFAULT_DAYS);
  return { start: isoDate(start), end: isoDate(end) };
}

function optionalNumber(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Match Up metrics: organisation → SMD → agent → prospect.
 *
 * The drill position, filters and section all live in the URL so a view can
 * be shared and the browser Back button walks back up the drill-down.
 */
export default function MatchupMetricsPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const [params, setParams] = useSearchParams();
  const [openAppointment, setOpenAppointment] = useState<AppointmentDetail | null>(null);
  const [rowSort, setRowSort] = useState<RowSort>({ key: 'total', descending: true });
  const [stepView, setStepView] = useState<'chart' | 'table'>('chart');
  const [rowsDetailed, setRowsDetailed] = useState(false);
  const rowsPanel = useRef<HTMLElement>(null);
  const { data: access } = useMatchupMetricsAccess();

  const range = useMemo(defaultRange, []);
  const segmentParam = params.get('segment') as Segment | null;
  const segment: Segment | undefined =
    segmentParam ?? (access && !access.org_wide ? 'BASESHOP' : undefined);
  const query: MetricsQuery = {
    start: params.get('start') || range.start,
    end: params.get('end') || range.end,
    mode: (params.get('mode') as CountMode) || 'prospects',
    segment,
  };
  const section = (params.get('section') as MetricsSection) || 'REQUEST_TRAINER';
  const smdRaw = params.get('smd');
  const path: DrillPath = {
    smd: smdRaw === 'none' ? null : optionalNumber(smdRaw),
    agent: optionalNumber(params.get('agent')),
    prospect: optionalNumber(params.get('prospect')),
  };

  const compare = params.get('compare') !== 'off';
  const report = useMetricsReport(path, query, Boolean(access));
  const previous = usePreviousReport(path, query, Boolean(access) && compare);
  const journey = useProspectJourney(path.prospect, query);

  function update(changes: Record<string, string | null>, push = false) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    });
    setParams(next, { replace: !push });
  }

  function openRow(row: MetricsRow) {
    if (row.kind === 'smd') update({ smd: row.id == null ? 'none' : String(row.id), smdName: row.name }, true);
    else if (row.kind === 'agent' && row.id != null) update({ agent: String(row.id), agentName: row.name }, true);
    else if (row.kind === 'prospect' && row.id != null) update({ prospect: String(row.id), prospectName: row.name }, true);
  }

  /** "See who" on an attention item: sort the rows by that problem and scroll to them. */
  function showRowsBy(columnKey: string) {
    setRowSort({ key: columnKey, descending: true });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    rowsPanel.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  async function showAppointment(appointment: JourneyAppointment) {
    try {
      setOpenAppointment(await matchupService.appointment(appointment.id));
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'You cannot open this appointment.',
      });
    }
  }

  const crumbs: { label: string; changes: Record<string, string | null> }[] = [
    { label: 'Organisation', changes: { smd: null, smdName: null, agent: null, agentName: null, prospect: null, prospectName: null } },
    ...(path.smd !== undefined
      ? [{ label: params.get('smdName') || 'SMD', changes: { agent: null, agentName: null, prospect: null, prospectName: null } }]
      : []),
    ...(path.agent != null
      ? [{ label: params.get('agentName') || 'Agent', changes: { prospect: null, prospectName: null } }]
      : []),
    ...(path.prospect != null ? [{ label: params.get('prospectName') || 'Prospect', changes: {} }] : []),
  ];

  const data = report.data;
  const current = data?.sections[section];
  // While the main report shows the last selection's data, a delta would compare mismatched windows.
  const baseline = previous.data && !report.isPlaceholderData ? previous.data.sections[section].summary : null;
  const priorWindow = previousWindow(query);
  const comparison: Comparison | undefined = compare
    ? { window: formatWindow(priorWindow.start, priorWindow.end), previous: baseline }
    : undefined;
  const rowKind = path.agent != null ? 'prospect' : path.smd !== undefined ? 'agent' : 'smd';
  const segmentOptions: { value: string; label: string }[] = [
    ...(access?.org_wide ? [{ value: '', label: 'Whole organisation' }] : []),
    ...(access?.segments ?? []).map((value) => ({ value, label: `My ${SEGMENT_LABELS[value]}` })),
  ];

  return (
    <main className="mm-page">
      <header className="mm-hero">
        <div>
          <span>Matchup</span>
          <h1>Appointment Metrics</h1>
          <p>How many booked appointments actually happen, and how many turn into an FNA, AMA or sale.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/matchup')}>
          <ArrowLeft size={16} /> Back to Matchup
        </Button>
      </header>

      <section className="mm-controls">
        <label>
          From
          <input type="date" value={query.start} max={query.end} onChange={(event) => update({ start: event.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={query.end} min={query.start} onChange={(event) => update({ end: event.target.value })} />
        </label>
        <label>
          Count
          <select value={query.mode} onChange={(event) => update({ mode: event.target.value })}>
            <option value="prospects">Each prospect once</option>
            <option value="appointments">Every appointment</option>
          </select>
        </label>
        <label>
          Compare
          <select value={compare ? 'previous' : 'off'} onChange={(event) => update({ compare: event.target.value === 'off' ? 'off' : null })}>
            <option value="previous">Previous period</option>
            <option value="off">Off</option>
          </select>
        </label>
        {segmentOptions.length > 1 && (
          <label>
            Team
            <select value={segment ?? ''} onChange={(event) => update({ segment: event.target.value || null })}>
              {segmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </section>

      <nav className="mm-crumbs" aria-label="Drill-down">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`}>
            {index > 0 && <ChevronRight size={14} />}
            {index < crumbs.length - 1 ? (
              <button type="button" onClick={() => update(crumb.changes, true)}>{crumb.label}</button>
            ) : (
              <strong>{crumb.label}</strong>
            )}
          </span>
        ))}
      </nav>

      {path.prospect != null ? (
        journey.isLoading ? (
          <p className="mm-empty">Loading…</p>
        ) : journey.isError ? (
          <p className="mm-error">{(journey.error as Error).message}</p>
        ) : journey.data ? (
          <ProspectJourneyView journey={journey.data} onOpenAppointment={(item) => void showAppointment(item)} />
        ) : null
      ) : (
        <>
          <div className="mm-tabs" role="tablist">
            {SECTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={section === item.key}
                className={section === item.key ? 'is-active' : ''}
                onClick={() => update({ section: item.key })}
              >
                {item.label}
                {data && <small>{data.sections[item.key].summary.total.toLocaleString()}</small>}
              </button>
            ))}
          </div>

          {report.isError && <p className="mm-error">{(report.error as Error).message}</p>}
          {report.isLoading && <p className="mm-empty">Loading…</p>}

          {data && current && (
            <div className={report.isFetching ? 'mm-body is-fetching' : 'mm-body'}>
              <OutcomeHero summary={current.summary} mode={data.mode} section={section} comparison={comparison} />
              <AttentionStrip summary={current.summary} mode={data.mode} section={section} onShow={showRowsBy} />
              <div className="mm-grid">
                <section className="mm-panel">
                  <h2>Funnel</h2>
                  <FunnelStrip stages={current.summary.funnel} />
                </section>
                <section className="mm-panel">
                  <div className="mm-panel-head">
                    <h2>By step</h2>
                    <div className="mm-toggle" role="group" aria-label="Step view">
                      {(['chart', 'table'] as const).map((view) => (
                        <button
                          key={view}
                          type="button"
                          aria-pressed={stepView === view}
                          className={stepView === view ? 'is-active' : ''}
                          onClick={() => setStepView(view)}
                        >
                          {view === 'chart' ? 'Chart' : 'Table'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {stepView === 'chart' ? (
                    <StepBars steps={data.steps} counts={current.summary.steps} section={section} />
                  ) : (
                    <StepTable steps={data.steps} counts={current.summary.steps} section={section} />
                  )}
                </section>
              </div>
              <section className="mm-panel mm-rows-panel" ref={rowsPanel}>
                <div className="mm-panel-head">
                  <h2>{rowKind === 'smd' ? 'By SMD' : rowKind === 'agent' ? 'By agent' : 'By prospect'}</h2>
                  <div className="mm-toggle" role="group" aria-label="Columns">
                    {[false, true].map((detailed) => (
                      <button
                        key={String(detailed)}
                        type="button"
                        aria-pressed={rowsDetailed === detailed}
                        className={rowsDetailed === detailed ? 'is-active' : ''}
                        onClick={() => setRowsDetailed(detailed)}
                      >
                        {detailed ? 'Detailed' : 'Summary'}
                      </button>
                    ))}
                  </div>
                </div>
                {rowKind === 'agent' && data.mode === 'prospects' && (
                  <p className="mm-note">
                    A prospect worked by two agents counts once for each, so agent rows can add up to more than the SMD total.
                  </p>
                )}
                <RowsTable
                  rows={current.rows}
                  sort={rowSort}
                  onSortChange={setRowSort}
                  steps={data.steps}
                  section={section}
                  mode={data.mode}
                  detailed={rowsDetailed}
                  title={ROW_TITLES[rowKind]}
                  onOpen={openRow}
                />
              </section>
            </div>
          )}
        </>
      )}

      <AppointmentDetailsModal appointment={openAppointment} onClose={() => setOpenAppointment(null)} />
    </main>
  );
}
