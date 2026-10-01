import { Modal, type RowColorStyle } from '@shared/components';
import { rowColorCondition, rowColorLabel, resolveRowColors, rowColorStyle } from '@shared/components/row-colors';

/** What the modal paints: a rule as currently drafted, saved or not. */
export interface ConditionKeyPreview {
  key: string;
  /** The rule's own name, when it has one yet. */
  label: string;
  hex: string;
  style: RowColorStyle;
}

interface ConditionKeyModalProps {
  preview: ConditionKeyPreview | null;
  onClose: () => void;
}

/**
 * "Show condition key" — what a condition means and what it looks like.
 *
 * The sample is a recreated guest row painted by the real resolver with this
 * rule alone, so it shows the draft color and style exactly as Guest Invites
 * and Guest Check-In would, before anything is saved. The rule is forced on for
 * the preview: a switched-off rule still has a look worth checking.
 */
export function ConditionKeyModal({ preview, onClose }: ConditionKeyModalProps) {
  const condition = preview ? rowColorCondition(preview.key) : undefined;
  const resolved = preview
    ? resolveRowColors(
        [preview.key],
        [
          {
            key: preview.key,
            label: preview.label || condition?.label || preview.key,
            hex: preview.hex,
            style: preview.style,
            priority: 0,
            enabled: true,
          },
        ],
      )
    : {};

  return (
    <Modal
      open={Boolean(preview)}
      title="Show condition key"
      onClose={onClose}
      dismissible
      contentClassName="max-w-[640px]"
    >
      {preview ? (
        <div className="grid gap-4 text-sm">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {condition?.label ?? 'Custom condition'}
            </div>
            <code className="break-all text-xs text-slate-500 dark:text-white/60">{preview.key}</code>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                  <th className="px-3 py-2">Guest</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Invited by</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-t border-slate-100 dark:border-white/10"
                  style={rowColorStyle(resolved)}
                  title={rowColorLabel(resolved) || undefined}
                >
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">Jordan Rivera</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">(555) 010-2345</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">Alex Morgan</td>
                </tr>
                {/* An uncolored neighbor, so the tint reads against something. */}
                <tr className="border-t border-slate-100 dark:border-white/10">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">Sam Lee</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">(555) 010-6789</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">Alex Morgan</td>
                </tr>
              </tbody>
            </table>
          </div>

          <dl className="grid gap-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
                When it applies
              </dt>
              <dd className="text-slate-700 dark:text-white/80">
                {condition?.description ??
                  'No BPM list is known to report this key, so a rule using it never colors a row.'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
                Where it appears
              </dt>
              <dd className="text-slate-700 dark:text-white/80">{condition?.appearsIn ?? 'Nowhere yet'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}
