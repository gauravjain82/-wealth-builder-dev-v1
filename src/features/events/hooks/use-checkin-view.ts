import { useCallback, useState } from 'react';
import type { CheckinListView } from '../components/checkin-purchase-list';

const STORAGE_KEY = 'wb.checkinListView';

function readStored(): CheckinListView {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'detailed' ? 'detailed' : 'door';
  } catch {
    return 'door';
  }
}

/**
 * Door or Detailed list, remembered per browser — a door tablet stays on Door,
 * a supervisor's laptop on Detailed. A display preference only: both views get
 * the same data and the backend checks every action.
 */
export function useCheckinView() {
  const [view, setViewState] = useState<CheckinListView>(readStored);

  const setView = useCallback((next: CheckinListView) => {
    setViewState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice lasts until reload.
    }
  }, []);

  return { view, setView };
}
