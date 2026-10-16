/** Staff-side rendering of the page context attached to a widget ticket. */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import type { SupportApiError, SupportContextPayload, SupportJsError } from '../services/helpdesk-service';
import { formatHelpdeskDate } from '../constants';

interface SupportContextPanelProps {
  context: Partial<SupportContextPayload> | Record<string, never> | undefined | null;
}

/** One "label: value" row; hidden when value is empty. */
function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-500 dark:text-white/55">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

const CELL = 'border-b border-slate-200 px-2 py-1 text-left align-top dark:border-white/10';

/** Table of recent failed API calls. */
function ApiErrorsTable({ rows }: { rows: SupportApiError[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-500 dark:text-white/55">
          <th className={CELL}>Time</th>
          <th className={CELL}>Method</th>
          <th className={CELL}>URL</th>
          <th className={CELL}>Status</th>
          <th className={CELL}>Request ID</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.at}-${index}`}>
            <td className={`${CELL} whitespace-nowrap`}>{formatHelpdeskDate(row.at)}</td>
            <td className={CELL}>{row.method}</td>
            <td className={`${CELL} break-all font-mono`}>{row.url}</td>
            <td className={CELL}>{row.status === 0 ? 'network' : row.status}</td>
            <td className={`${CELL} break-all font-mono`}>{row.request_id || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Table of recent JS errors. */
function JsErrorsTable({ rows }: { rows: SupportJsError[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-500 dark:text-white/55">
          <th className={CELL}>Time</th>
          <th className={CELL}>Message</th>
          <th className={CELL}>Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.at}-${index}`}>
            <td className={`${CELL} whitespace-nowrap`}>{formatHelpdeskDate(row.at)}</td>
            <td className={`${CELL} break-words`}>{row.message}</td>
            <td className={`${CELL} break-all font-mono`}>{row.source || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Collapsible "Page details" panel: page + label, browser/OS/viewport/timezone, app
 * version, assistant flag, recent API and JS errors, plus a raw JSON toggle. Renders
 * nothing when the ticket has no context.
 */
export function SupportContextPanel({ context }: SupportContextPanelProps) {
  const [open, setOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const ctx = (context ?? {}) as Partial<SupportContextPayload>;
  if (Object.keys(ctx).length === 0) return null;

  const page = ctx.page;
  const env = ctx.env;
  const apiErrors = Array.isArray(ctx.recent_api_errors) ? ctx.recent_api_errors : [];
  const jsErrors = Array.isArray(ctx.recent_js_errors) ? ctx.recent_js_errors : [];
  const routeParams = ctx.route_params && Object.keys(ctx.route_params).length > 0
    ? Object.entries(ctx.route_params).map(([key, value]) => `${key}=${value}`).join(', ')
    : '';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Page details
        <span className="ml-auto text-xs font-normal text-slate-500 dark:text-white/55">
          {apiErrors.length} API error{apiErrors.length === 1 ? '' : 's'} · {jsErrors.length} JS error{jsErrors.length === 1 ? '' : 's'}
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-200 p-3 text-xs dark:border-white/10">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowRaw((current) => !current)}
              className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
            >
              {showRaw ? 'Formatted view' : 'Raw JSON'}
            </button>
          </div>
          {showRaw ? (
            <pre className="max-h-80 overflow-auto rounded-md bg-white p-2 font-mono text-[11px] dark:bg-black/40">
              {JSON.stringify(ctx, null, 2)}
            </pre>
          ) : (
            <>
              <dl className="grid gap-1 md:grid-cols-2">
                <Row label="Page" value={page ? `${page.path ?? ''}${page.search ?? ''}` : ''} />
                <Row label="Menu label" value={page?.label} />
                <Row label="Title" value={page?.title} />
                <Row label="Route params" value={routeParams} />
                <Row label="Captured" value={formatHelpdeskDate(ctx.captured_at)} />
                <Row label="Assistant" value={ctx.session ? (ctx.session.acting_as_assistant ? 'Yes - acting for SMD' : 'No') : ''} />
                <Row label="App version" value={ctx.app?.version || (ctx.app ? 'unknown' : '')} />
                <Row label="Build time" value={ctx.app?.build_time} />
                <Row label="Browser" value={env?.user_agent} />
                <Row label="Platform" value={env?.platform} />
                <Row label="Language" value={env?.language} />
                <Row label="Timezone" value={env?.timezone} />
                <Row label="Viewport" value={env?.viewport ? `${env.viewport.w} × ${env.viewport.h}` : ''} />
                <Row label="Screen" value={env?.screen ? `${env.screen.w} × ${env.screen.h} @${env.dpr ?? 1}x` : ''} />
                <Row label="Online" value={env ? (env.online ? 'Yes' : 'No') : ''} />
              </dl>
              <div>
                <h4 className="mb-1 font-semibold">Recent API errors</h4>
                {apiErrors.length ? <div className="overflow-x-auto"><ApiErrorsTable rows={apiErrors} /></div> : <p className="text-slate-500 dark:text-white/55">None recorded.</p>}
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Recent JS errors</h4>
                {jsErrors.length ? <div className="overflow-x-auto"><JsErrorsTable rows={jsErrors} /></div> : <p className="text-slate-500 dark:text-white/55">None recorded.</p>}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
