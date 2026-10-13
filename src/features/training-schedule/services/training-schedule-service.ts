/**
 * API client for the training schedule (`/api/training-schedule/`).
 *
 * Shaped after `code-of-honor-service.ts`: same token header, guarded JSON parse,
 * and every read takes an `AbortSignal`. The backend answers failures with
 * `{"error": {code, message, detail}}`; `TrainingScheduleError` keeps the stable
 * `code` (the UI switches on it) and the `detail` (the next date when attendance
 * is not open, the fresh preview when a delete went stale).
 *
 * Hiding a control is not authorization: every endpoint is checked server-side.
 */

import type {
  AttendanceRoster,
  AttendResult,
  DeletePreview,
  Host,
  HostTraining,
  MyAccess,
  ScheduleOccurrence,
  ScheduleSettings,
  ScheduleSettingsPatch,
  TrainingInput,
  TrainingPatch,
  TrainingTarget,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = `${API_BASE_URL}/api/training-schedule`;

/** An API failure with the backend's stable error code and structured detail. */
export class TrainingScheduleError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly detail: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = 'TrainingScheduleError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function headers(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

/** Turn a non-2xx response into a `TrainingScheduleError` (a proxy may still answer with HTML). */
async function failure(response: Response): Promise<TrainingScheduleError> {
  try {
    const body = await response.json();
    const error = body?.error;
    if (error && typeof error.message === 'string') {
      return new TrainingScheduleError(error.message, response.status, error.code, error.detail ?? {});
    }
    return new TrainingScheduleError(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`,
      response.status
    );
  } catch {
    return new TrainingScheduleError(`Request failed: ${response.status}`, response.status);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}`, { ...init, headers: headers() });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new TrainingScheduleError('Network problem — check your connection and try again.', 0, 'network');
  }
  if (!response.ok) throw await failure(response);
  return (await response.json()) as T;
}

const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal });
const send = <T>(method: 'POST' | 'PATCH', path: string, body: unknown = {}) =>
  request<T>(path, { method, body: JSON.stringify(body) });

/** The body that names the whole series or one date of it. */
function scopeBody(target: TrainingTarget) {
  return target.occurrenceId === undefined
    ? { scope: 'series' }
    : { scope: 'occurrence', occurrence_id: target.occurrenceId };
}

export const fetchMyAccess = (signal?: AbortSignal) => get<MyAccess>('my-access/', signal);

export async function fetchOccurrences(
  range: { start: string; end: string; everything: boolean },
  signal?: AbortSignal
): Promise<ScheduleOccurrence[]> {
  const params = new URLSearchParams({ start: range.start, end: range.end });
  if (range.everything) params.set('scope', 'all');
  const body = await get<{ occurrences: ScheduleOccurrence[] }>(`occurrences/?${params}`, signal);
  return body.occurrences;
}

export const createTraining = (input: TrainingInput) =>
  send<{ ok: true; training_id: number }>('POST', 'trainings/', input);

export const updateTraining = (trainingId: number, patch: TrainingPatch) =>
  send<{ ok: true; training_id: number }>('PATCH', `trainings/${trainingId}/`, patch);

export const fetchDeletePreview = (target: TrainingTarget, signal?: AbortSignal) =>
  get<DeletePreview>(
    `trainings/${target.trainingId}/delete-preview/${
      target.occurrenceId === undefined ? '' : `?occurrence_id=${target.occurrenceId}`
    }`,
    signal
  );

/** `expectedCount` is the `occurrence_count` the host confirmed; a mismatch answers 409. */
export const deleteTraining = (target: TrainingTarget, expectedCount: number) =>
  send<{ ok: true; deleted: DeletePreview }>('POST', `trainings/${target.trainingId}/delete/`, {
    ...scopeBody(target),
    expected_occurrence_count: expectedCount,
  });

export const inheritTraining = (target: TrainingTarget) =>
  send<{ ok: true }>('POST', `trainings/${target.trainingId}/inherit/`, scopeBody(target));

export const uninheritTraining = (target: TrainingTarget) =>
  send<{ ok: true }>('POST', `trainings/${target.trainingId}/uninherit/`, scopeBody(target));

export async function fetchHosts(query: string, signal?: AbortSignal): Promise<Host[]> {
  const body = await get<{ hosts: Host[] }>(
    query ? `hosts/?q=${encodeURIComponent(query)}` : 'hosts/',
    signal
  );
  return body.hosts;
}

export async function fetchHostTrainings(hostId: number, signal?: AbortSignal): Promise<HostTraining[]> {
  const body = await get<{ trainings: HostTraining[] }>(`hosts/${hostId}/trainings/`, signal);
  return body.trainings;
}

export const fetchAttendance = (occurrenceId: number, signal?: AbortSignal) =>
  get<AttendanceRoster>(`occurrences/${occurrenceId}/attendance/`, signal);

export const attend = (token: string) =>
  send<AttendResult>('POST', `attend/${encodeURIComponent(token)}/`);

export const fetchSettings = (signal?: AbortSignal) => get<ScheduleSettings>('admin/settings/', signal);

export const saveSettings = (patch: ScheduleSettingsPatch) =>
  send<ScheduleSettings>('PATCH', 'admin/settings/', patch);
