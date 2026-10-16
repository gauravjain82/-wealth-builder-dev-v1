/** Header button that opens the "Report a problem" dialog from any page. */

import { LifeBuoy, Loader2 } from 'lucide-react';

import { ReportProblemLauncher } from './report-problem-dialog';

/**
 * LifeBuoy button for the header. Takes the screenshot first, then opens the dialog,
 * so the dialog never appears in the capture.
 */
export function ReportProblemButton() {
  return (
    <ReportProblemLauncher captureOnOpen>
      {({ start, busy }) => (
        <button
          type="button"
          className="header__report-button"
          onClick={start}
          disabled={busy}
          aria-label="Report a problem"
          aria-busy={busy}
          title="Report a problem"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <LifeBuoy size={18} />}
          <span className="header__report-label">Report a problem</span>
        </button>
      )}
    </ReportProblemLauncher>
  );
}
