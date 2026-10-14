import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Plus, Settings } from 'lucide-react';

import { Button } from '@/shared/components';

import { AttendanceModal } from '../components/attendance-modal';
import { DeleteTrainingDialog } from '../components/delete-training-dialog';
import { Notice, mutedText } from '../components/fields';
import { InheritModal } from '../components/inherit-modal';
import { AttendanceDashboard } from '../components/metrics/attendance-dashboard';
import { OccurrenceModal } from '../components/occurrence-modal';
import { SettingsModal } from '../components/settings-modal';
import { TrainingFormModal } from '../components/training-form-modal';
import { WeekGrid } from '../components/week-grid';
import { useAttendanceMetrics, useOccurrences, useTrainingScheduleAccess } from '../hooks/use-training-schedule';
import type { ScheduleOccurrence, TrainingTarget } from '../types';
import { addDays, startOfWeek, viewerTimezone, zoneAbbreviation } from '../utils/time';
import '../training-schedule.css';

/** "4 people stopped attending and 2 are slipping" — the nudge that leads a host to the Attendance tab. */
function AttendanceBanner({ onOpen }: { onOpen: () => void }) {
  const metrics = useAttendanceMetrics(null, 4, true);
  const counts = metrics.data?.summary.status_counts;
  if (!counts) return null;
  const stopped = counts.stopped + counts.never;
  if (!stopped && !counts.slipping) return null;
  const parts = [
    stopped ? `${stopped} ${stopped === 1 ? 'person has' : 'people have'} stopped attending or never came` : null,
    counts.slipping ? `${counts.slipping} ${counts.slipping === 1 ? 'is' : 'are'} slipping` : null,
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm ${
        stopped
          ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-100'
          : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100'
      }`}
    >
      <AlertTriangle size={16} className="shrink-0" aria-hidden />
      <span className="flex-1">In your BaseShop, {parts.join(' and ')}.</span>
      <span className="shrink-0 font-semibold underline">View attendance</span>
    </button>
  );
}
/**
 * The week's trainings for the signed-in member: their hosts' trainings and the
 * ones those hosts inherited. Hosts (SMD and above) also create, inherit and
 * take attendance here; administrators can switch to every training.
 */
export default function TrainingSchedulePage() {
  const access = useTrainingScheduleAccess();
  const canHost = access.data?.can_host ?? false;
  const isAdmin = access.data?.can_manage_all ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const showAttendance = (canHost || isAdmin) && searchParams.get('view') === 'attendance';
  const openView = (view: 'schedule' | 'attendance') =>
    setSearchParams(view === 'attendance' ? { view } : {}, { replace: true });

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [everything, setEverything] = useState(false);
  const range = useMemo(
    () => ({
      start: weekStart.toISOString(),
      end: addDays(weekStart, 7).toISOString(),
      everything: everything && isAdmin,
    }),
    [weekStart, everything, isAdmin],
  );
  const schedule = useOccurrences(range);
  const occurrences = useMemo(() => schedule.data ?? [], [schedule.data]);

  // Selections are held by id and read back from the query, so an open dialog
  // follows a refetch instead of showing the row as it was when clicked.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleOccurrence | null>(null);
  const [deleting, setDeleting] = useState<TrainingTarget | null>(null);
  const [inheritOpen, setInheritOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const byId = (id: number | null) => occurrences.find((occurrence) => occurrence.id === id) ?? null;

  const weekEnd = addDays(weekStart, 6);
  const zone = viewerTimezone();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Schedule</h1>
          <p className={mutedText}>
            Times are shown in your time zone — {zone} ({zoneAbbreviation(zone, weekStart)}). Trainings scheduled in
            another zone are marked.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 dark:border-white/20 dark:text-white/90">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={everything}
                  onChange={(event) => setEverything(event.target.checked)}
                />
                All trainings
              </label>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings size={15} aria-hidden />
                <span className="ml-1.5">Settings</span>
              </Button>
            </>
          ) : null}
          {canHost ? (
            <>
              <Button type="button" variant="outline" onClick={() => setInheritOpen(true)}>
                <Download size={15} aria-hidden />
                <span className="ml-1.5">Inherit a training</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={15} aria-hidden />
                <span className="ml-1.5">New training</span>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canHost || isAdmin ? (
        <div className="flex gap-1 border-b border-slate-200 dark:border-white/10" role="tablist">
          {(['schedule', 'attendance'] as const).map((view) => {
            const selected = (view === 'attendance') === showAttendance;
            return (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => openView(view)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  selected
                    ? 'border-primary text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white'
                }`}
              >
                {view === 'schedule' ? 'Schedule' : 'Attendance'}
              </button>
            );
          })}
        </div>
      ) : null}

      {showAttendance ? (
        <AttendanceDashboard canHost={canHost} isAdmin={isAdmin} />
      ) : (
        <>
          {canHost ? <AttendanceBanner onOpen={() => openView('attendance')} /> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              aria-label="Previous week"
            >
              <ChevronLeft size={16} aria-hidden />
            </Button>
            <Button type="button" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              aria-label="Next week"
            >
              <ChevronRight size={16} aria-hidden />
            </Button>
            <span className="ml-2 text-sm font-medium text-slate-800 dark:text-white/90">
              {weekStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              –{' '}
              {weekEnd.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {schedule.isFetching ? <span className={mutedText}>Loading…</span> : null}
          </div>

          {schedule.isError ? (
            <Notice tone="danger">
              Could not load the schedule: {schedule.error.message}{' '}
              <button type="button" className="font-medium underline" onClick={() => void schedule.refetch()}>
                Try again
              </button>
            </Notice>
          ) : null}
          {schedule.isSuccess && occurrences.length === 0 ? (
            <Notice tone="info">
              {range.everything
                ? 'No trainings are scheduled this week.'
                : canHost
                  ? 'Nothing is scheduled for your BaseShop this week. Create a training or inherit one from another host.'
                  : 'No trainings are scheduled for your BaseShop this week.'}
            </Notice>
          ) : null}

          <WeekGrid weekStart={weekStart} occurrences={occurrences} onSelect={(o) => setSelectedId(o.id)} />
        </>
      )}

      <OccurrenceModal
        occurrence={byId(selectedId)}
        onClose={() => setSelectedId(null)}
        onEdit={(occurrence) => {
          setSelectedId(null);
          setEditing(occurrence);
          setFormOpen(true);
        }}
        onDelete={setDeleting}
        onShowAttendance={(occurrence) => {
          setSelectedId(null);
          setAttendanceId(occurrence.id);
        }}
      />
      <TrainingFormModal open={formOpen} editing={editing} onClose={() => setFormOpen(false)} />
      <DeleteTrainingDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          setSelectedId(null);
        }}
      />
      <AttendanceModal occurrence={byId(attendanceId)} onClose={() => setAttendanceId(null)} />
      <InheritModal open={inheritOpen} onClose={() => setInheritOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
