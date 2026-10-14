import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';

import { Button, Modal } from '@/shared/components';
import { useToastStore } from '@/store';

import { useHostTrainings, useHosts, useInheritTraining } from '../hooks/use-training-schedule';
import type { Host, HostTraining, TrainingTarget } from '../types';
import { differsFromViewer, formatDay, formatTime, zoneAbbreviation } from '../utils/time';
import { Notice, fieldClass, mutedText } from './fields';

function HostPicker({ onPick }: { onPick: (host: Host) => void }) {
  const [query, setQuery] = useState('');
  const hosts = useHosts(query, true);
  const searching = query.trim().length >= 2;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-3 text-slate-400" aria-hidden />
        <input
          className={`${fieldClass} pl-9`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search any SMD by name…"
          aria-label="Search hosts"
        />
      </div>
      <p className={mutedText}>
        {searching
          ? 'Searching every host — for a training you run jointly with someone outside your upline.'
          : 'Your upline hosts. Search to inherit from someone outside your upline.'}
      </p>
      {hosts.isLoading ? <p className={mutedText}>Loading…</p> : null}
      {hosts.isError ? <Notice tone="danger">{hosts.error.message}</Notice> : null}
      {hosts.data && hosts.data.length === 0 ? (
        <p className={mutedText}>{searching ? 'No host matches that name.' : 'There are no hosts in your upline.'}</p>
      ) : null}
      <ul className="divide-y divide-slate-200 dark:divide-white/10">
        {hosts.data?.map((host) => (
          <li key={host.id}>
            <button
              type="button"
              onClick={() => onPick(host)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <span className="text-slate-900 dark:text-white">
                {host.name}
                {host.level ? <span className="ml-2 text-xs text-slate-500 dark:text-white/50">{host.level}</span> : null}
                {host.is_upline ? (
                  <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-400/20 dark:text-sky-100">
                    Upline
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-slate-500 dark:text-white/50">
                {host.training_count === 0
                  ? 'No upcoming trainings'
                  : `${host.training_count} training${host.training_count === 1 ? '' : 's'}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrainingCard({
  training,
  busy,
  onToggle,
}: {
  training: HostTraining;
  busy: boolean;
  onToggle: (target: TrainingTarget, inherit: boolean) => void;
}) {
  const first = training.occurrences[0];
  const otherZone = differsFromViewer(training.timezone, first.start_at);
  return (
    <li className="rounded-lg border border-slate-200 p-3 dark:border-white/10" style={{ borderLeftWidth: 4, borderLeftColor: training.color }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{training.title}</p>
          {training.description ? <p className={`mt-0.5 ${mutedText}`}>{training.description}</p> : null}
          {otherZone ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-200">
              Scheduled in {training.timezone} ({zoneAbbreviation(training.timezone, first.start_at)}) — times below are
              converted to yours.
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant={training.inherits_series ? 'outline' : 'default'}
          disabled={busy}
          onClick={() => onToggle({ trainingId: training.id }, !training.inherits_series)}
        >
          {training.inherits_series ? 'Stop inheriting series' : 'Inherit all dates'}
        </Button>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">
        Or pick single dates
      </p>
      <ul className="mt-1 grid gap-1 sm:grid-cols-2">
        {training.occurrences.map((occurrence) => (
          <li key={occurrence.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-slate-800 hover:bg-slate-100 dark:text-white/90 dark:hover:bg-white/5">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={occurrence.inherited}
                disabled={busy}
                onChange={(event) =>
                  onToggle({ trainingId: training.id, occurrenceId: occurrence.id }, event.target.checked)
                }
              />
              {formatDay(occurrence.start_at)} · {formatTime(occurrence.start_at)}
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
}

interface InheritModalProps {
  open: boolean;
  onClose: () => void;
}

/** Pick a host, then publish their trainings — a whole series or single dates — to your BaseShop. */
export function InheritModal({ open, onClose }: InheritModalProps) {
  const [host, setHost] = useState<Host | null>(null);
  const trainings = useHostTrainings(open && host ? host.id : null);
  const inherit = useInheritTraining();
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!open) setHost(null);
  }, [open]);

  const toggle = async (target: TrainingTarget, wanted: boolean) => {
    try {
      await inherit.mutateAsync({ target, inherit: wanted });
      addToast({
        type: 'success',
        message: wanted ? 'Added to your BaseShop’s schedule.' : 'Removed from your BaseShop’s schedule.',
      });
    } catch (failure) {
      addToast({ type: 'error', message: failure instanceof Error ? failure.message : 'Could not update it.' });
    }
  };

  return (
    <Modal
      open={open}
      title={host ? `${host.name}’s trainings` : 'Inherit a training'}
      subtitle="An inherited training appears on your whole BaseShop’s schedule. The host keeps control of it."
      onClose={onClose}
      contentClassName="max-w-[680px]"
      dismissible
    >
      <div className="space-y-3 overflow-y-auto pr-1">
        {host ? (
          <>
            <button
              type="button"
              onClick={() => setHost(null)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft size={14} aria-hidden />
              All hosts
            </button>
            {trainings.isLoading ? <p className={mutedText}>Loading…</p> : null}
            {trainings.isError ? <Notice tone="danger">{trainings.error.message}</Notice> : null}
            {trainings.data && trainings.data.length === 0 ? (
              <p className={mutedText}>{host.name} has no upcoming trainings.</p>
            ) : null}
            <ul className="space-y-3">
              {trainings.data?.map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  busy={inherit.isPending || trainings.isFetching}
                  onToggle={(target, wanted) => void toggle(target, wanted)}
                />
              ))}
            </ul>
          </>
        ) : (
          <HostPicker onPick={setHost} />
        )}
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
