import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { BPM_GUEST_ROW_COLORS } from '@shared/components/row-colors';
import { bpmService } from '../services/bpm-service';
import type { BPMRowColorRule, BPMSettings } from '../types';

/**
 * BPM's two pieces of platform configuration, fetched once per `/bpm` mount:
 * the settings singleton and the row-colour rule set.
 *
 * They are served together because they are read together and for the same
 * reason — several components on several pages each need one of them, and a
 * self-fetching hook would issue a request per consumer. One provider under the
 * BPM route tree fetches each once and re-renders everybody. (A module-level
 * cache in the service was the other candidate and is worse: nothing
 * re-renders when it resolves, so a table would paint its fallback and then
 * never update.)
 *
 * **Row colours: the server is now the source of truth.** Phase 0 shipped the
 * six schemes named in the brief as a client constant so lists were coloured
 * before a backend existed. Phase 7 moved them into the database (migration
 * `bpm/0020`) so an admin can recolour or switch one off from BPM Settings the
 * same way as their own rules. `BPM_GUEST_ROW_COLORS` is kept only as a
 * lifeboat for a failed fetch — see §6.10 of BPM_V2_PLAN.md for the trade.
 *
 * **What renders before the rules arrive: nothing.** Rows stay plain until the
 * set resolves. A list where "not interested" is briefly the *wrong* colour is
 * worse than one that is briefly uncoloured, because the colour is a signal
 * people act on and the absence of one is merely a missing aid. The cost is a
 * flash of plain rows, so it is paid once per tab: the resolved set is mirrored
 * into sessionStorage and seeds the next mount, the same trick
 * `bpm-selection-context` uses for the sticky selection.
 */

/** sessionStorage key holding the last resolved rule set for this tab. */
const RULES_STORAGE_KEY = 'wb.bpm.rowColorRules';

function readCachedRules(): BPMRowColorRule[] | null {
  try {
    const raw = sessionStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BPMRowColorRule[]) : null;
  } catch {
    // Private mode, blocked storage, or a stale shape from an older build.
    return null;
  }
}

function writeCachedRules(rules: BPMRowColorRule[]) {
  try {
    sessionStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Non-fatal: the only cost is a flash of plain rows on the next mount.
  }
}

interface BpmConfigContextValue {
  /** The settings singleton, or null until it resolves / if it fails. */
  settings: BPMSettings | null;
  /** The row-colour rules in force. Empty while the first fetch is in flight. */
  rules: BPMRowColorRule[];
  loading: boolean;
  /** Re-read both from the server. Called by BPM Settings after an edit. */
  refresh: () => Promise<void>;
}

const BpmConfigContext = createContext<BpmConfigContextValue>({
  settings: null,
  // Outside the provider (a BPM list mounted somewhere unexpected) the shipped
  // defaults are better than no colour at all — there is nothing to wait for.
  rules: BPM_GUEST_ROW_COLORS as BPMRowColorRule[],
  loading: false,
  refresh: async () => {},
});

export function BpmConfigProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BPMSettings | null>(null);
  const [rules, setRules] = useState<BPMRowColorRule[]>(() => readCachedRules() ?? []);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [settingsResult, rulesResult] = await Promise.allSettled([
      bpmService.settings(),
      bpmService.rowColorRules(),
    ]);

    // A failed settings fetch leaves `settings` null, and every consumer reads
    // it with a permissive default — a configuration blip must not hide a
    // download link or lock a door screen.
    if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);

    if (rulesResult.status === 'fulfilled') {
      setRules(rulesResult.value);
      writeCachedRules(rulesResult.value);
    } else {
      // The lifeboat. A permanently uncoloured list would be a silent
      // regression, so a failed fetch falls back to what shipped in the bundle.
      setRules(BPM_GUEST_ROW_COLORS as BPMRowColorRule[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, rules, loading, refresh }),
    [settings, rules, loading, refresh],
  );

  return <BpmConfigContext.Provider value={value}>{children}</BpmConfigContext.Provider>;
}

/** The whole BPM configuration. Prefer the two narrow hooks below. */
export function useBpmConfig(): BpmConfigContextValue {
  return useContext(BpmConfigContext);
}

/**
 * The effective row-colour rules.
 *
 * Pass the result straight to `resolveRowColors` / `rowColorStyleFor` — the
 * resolver stays the single place a winning colour is picked, and this only
 * changes where the rules come from.
 */
export function useRowColorRules(): BPMRowColorRule[] {
  return useContext(BpmConfigContext).rules;
}

/**
 * Whether the download control should be offered.
 *
 * Defaults to `true` while the settings are unresolved: per **D11** this is a
 * UI gate on a file that stays reachable either way, so flickering a link off
 * and on buys nothing, while hiding it on a failed fetch would look like a bug.
 */
export function useAttachmentsDownloadAllowed(): boolean {
  return useContext(BpmConfigContext).settings?.attachments_download ?? true;
}
