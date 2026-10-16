/**
 * Builds the allow-listed page context attached to "Report a problem" tickets.
 *
 * README — what is (and is not) sent:
 * - Only the fields of `SupportContextPayload` (see PHASE3_CONTRACT.md): page path,
 *   redacted query string, document title, menu label, route params, app version,
 *   browser/OS/viewport/timezone, whether an assistant is acting for an SMD, and the
 *   last 10 failed API calls / JS errors from `client-error-buffer.ts`.
 * - Never localStorage, cookies, React Query or Zustand state, form values, or
 *   request/response bodies. The backend re-filters to the same schema.
 * - Query values whose key contains token|key|password|secret|code|auth|signature|
 *   session are replaced by `[redacted]`.
 * - Screenshots (`capture-screenshot.ts`) skip `input[type=password]` and every element
 *   carrying the `data-support-redact` attribute. Put `data-support-redact` on any
 *   element whose content must never appear in a support screenshot (e.g. a revealed
 *   API key or bank details); nothing in the app is marked globally.
 */

import { useCallback, useMemo } from 'react';
import { useLocation, useMatches } from 'react-router-dom';

import { findMenuLabelByPath } from '@/config/menu';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useRoleBasedMenu } from '@/hooks/use-role-based-menu';

import type { SupportContextPayload } from '../services/helpdesk-service';
import { getRecentApiErrors, getRecentJsErrors } from './client-error-buffer';
import { clip, redactSearch } from './redact';

/** Inputs that only React (router/auth/menu) can supply. */
export interface SupportContextInput {
  pathname: string;
  search: string;
  routeParams: Record<string, string>;
  pageLabel: string;
  actingAsAssistant: boolean;
}

/** IANA timezone of the browser, or '' when unavailable. */
function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** Build the context payload from React-supplied inputs plus browser globals. */
export function collectSupportContext(input: SupportContextInput): SupportContextPayload {
  const routeParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.routeParams)) {
    routeParams[clip(key, 100)] = clip(value);
  }
  return {
    captured_at: new Date().toISOString(),
    page: {
      path: clip(input.pathname),
      search: clip(redactSearch(input.search)),
      title: clip(document.title || ''),
      label: clip(input.pageLabel),
    },
    route_params: routeParams,
    app: {
      version: clip(import.meta.env.VITE_APP_VERSION ?? ''),
      build_time: clip(import.meta.env.VITE_BUILD_TIME ?? ''),
    },
    env: {
      user_agent: clip(navigator.userAgent || ''),
      platform: clip(navigator.platform || ''),
      language: clip(navigator.language || ''),
      timezone: browserTimezone(),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      screen: { w: window.screen?.width ?? 0, h: window.screen?.height ?? 0 },
      dpr: window.devicePixelRatio || 1,
      online: navigator.onLine,
    },
    session: { acting_as_assistant: input.actingAsAssistant },
    recent_api_errors: getRecentApiErrors(),
    recent_js_errors: getRecentJsErrors(),
  };
}

/**
 * Returns a function that snapshots the current page context. Must be used inside
 * the router (reads location, matched route params and the user's menu).
 */
export function useSupportContext(): () => SupportContextPayload {
  const location = useLocation();
  const matches = useMatches();
  const menu = useRoleBasedMenu();
  const { user } = useAuth();
  const actingAsAssistant = Boolean(user?.actingAs);

  const routeParams = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const match of matches) {
      for (const [key, value] of Object.entries(match.params)) {
        if (key !== '*' && typeof value === 'string') merged[key] = value;
      }
    }
    return merged;
  }, [matches]);

  const pageLabel = useMemo(() => findMenuLabelByPath(menu, location.pathname), [menu, location.pathname]);

  return useCallback(
    () =>
      collectSupportContext({
        pathname: location.pathname,
        search: location.search,
        routeParams,
        pageLabel,
        actingAsAssistant,
      }),
    [actingAsAssistant, location.pathname, location.search, pageLabel, routeParams]
  );
}
