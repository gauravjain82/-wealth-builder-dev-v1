import { useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';

import { Button, Modal } from '@/shared/components';

import { useAttendance } from '../hooks/use-training-schedule';
import type { ScheduleOccurrence } from '../types';
import { attendanceUrl, formatDay, formatTime, formatTimeRange } from '../utils/time';
import { Notice, fieldClass, mutedText } from './fields';

/** The link to post in the meeting chat, with a copy button. */
export function AttendanceLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = attendanceUrl(token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin, permissions): the field is selectable.
    }
  };

  return (
    <div className="flex gap-2">
      <input
        readOnly
        aria-label="Attendance link"
        className={`${fieldClass} font-mono text-xs`}
        value={url}
        onFocus={(event) => event.target.select()}
      />
      <Button type="button" variant="outline" onClick={() => void copy()} className="shrink-0">
        {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
        <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
      </Button>
    </div>
  );
}

interface AttendanceModalProps {
  /** The date whose attendance is shown; null closes the modal. */
  occurrence: ScheduleOccurrence | null;
  onClose: () => void;
}

/** Who has opened the attendance link for one date, refreshed while it is open. */
export function AttendanceModal({ occurrence, onClose }: AttendanceModalProps) {
  const roster = useAttendance(occurrence?.id ?? null);
  if (!occurrence) return null;
  const data = roster.data;

  return (
    <Modal
      open
      title="Attendance"
      subtitle={`${occurrence.title} · ${formatDay(occurrence.start_at)}, ${formatTimeRange(occurrence.start_at, occurrence.end_at)}`}
      onClose={onClose}
      contentClassName="max-w-[560px]"
      dismissible
    >
      <div className="space-y-4 overflow-y-auto pr-1">
        {occurrence.attendance_token ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-800 dark:text-white/90">
              Share this link in the meeting chat
            </p>
            <AttendanceLink token={occurrence.attendance_token} />
            <p className="text-xs text-slate-500 dark:text-white/50">
              Anyone who opens it while signed in is marked as attended. The same link works for every date of
              this training.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-white/10">
          <p className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white" aria-live="polite">
            <Users size={18} aria-hidden />
            {data ? `${data.count} attended` : 'Attendance'}
          </p>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            Live
          </span>
        </div>

        {data?.scope === 'baseshop' ? (
          <p className={mutedText}>Showing attendees from your BaseShop. {occurrence.owner.name} sees everyone.</p>
        ) : null}

        {roster.isLoading ? <p className={mutedText}>Loading…</p> : null}
        {roster.isError && !data ? <Notice tone="danger">Could not load attendance. It will retry shortly.</Notice> : null}
        {data && data.count === 0 ? <p className={mutedText}>Nobody has opened the link yet.</p> : null}
        {data && data.count > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {data.attendees.map((attendee) => (
              <li key={attendee.user_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-white">
                  {attendee.name}
                  {attendee.level ? (
                    <span className="ml-2 text-xs text-slate-500 dark:text-white/50">{attendee.level}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-white/50">
                  {formatTime(attendee.attended_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
