import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, Plus } from 'lucide-react';
import { useToastStore } from '@/store';
import { Button, Input, Select } from '@shared/components/ui';
import { AddAgencyCodeModal } from '@/features/team/prospect/components/add-agency-code-modal';
import { AddProductionModal, type AddProductionFormData } from '@/features/team/prospect/components/add-production-modal';
import { AddProspectModal } from '@/features/team/prospect/components/add-prospect-modal';
import { TrackerTeamScopeFilter, type TrackerTeamScope } from '@/features/team/components/tracker-team-scope-filter';
import {
  activateProspectWithAgencyCode,
  createProspect,
  updateProspectDetails,
  type Prospect,
} from '@/features/team/prospect/services/prospect-service';
import { defaultAddProspectForm, type AddAgentFormData, type AddProspectFormData } from '@/features/team/prospect/types';
import {
  createProductionRecord,
  fetchProductionCompanyProducts,
  fetchProductionSplitPresets,
} from '@/features/team/production-tracker/services/production-tracker-service';
import { ActionRequiredPanel } from '../components/action-required-panel';
import { AppointmentFormModal } from '../components/appointment-form-modal';
import { AppointmentList } from '../components/appointment-list';
import { AppointmentDetailsModal } from '../components/appointment-details-modal';
import { AssignTrainerModal } from '../components/assign-trainer-modal';
import { CompleteAppointmentModal } from '../components/complete-appointment-modal';
import { MetricsCards } from '../components/metrics-cards';
import { MonthCalendar } from '../components/month-calendar';
import { useMatchupDashboard } from '../hooks/use-matchup-dashboard';
import { matchupService } from '../services/matchup-service';
import type {
  AppointmentFilters,
  AppointmentDetail,
  AppointmentKind,
  AppointmentListItem,
  CompleteAppointmentPayload,
  CreateAppointmentPayload,
  LocationType,
} from '../types';
import './matchup-page.css';
import { createTrackerNote, fetchTrackerNotesForUser, type TrackerNote } from '@/features/team/services/tracker-notes-service';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import { ProspectDetailsModal } from '@/features/team/prospect/components/prospect-details-modal';

interface FollowUpAppointmentDefaults {
  kind: AppointmentKind;
  start_at: string;
  timezone: string;
  duration_minutes: number;
  types: number[];
  location_type: LocationType;
  url: string;
  url_nickname: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  contact: number | null;
  contactLabel: string;
  contact_phone: string;
  contact_spouse_name: string;
  trainee: number | null;
  traineeLabel: string;
  trainee_phone: string;
}

function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function emptyProspectMeta() {
  return {
    notes: '',
    hot: false,
    top25: false,
    outcome: '',
    mark: '',
    files: [],
    source_date: null,
  };
}

function prospectFromAppointment(appointment: AppointmentListItem): Prospect | null {
  const id = appointment.contact ?? appointment.trainee;
  if (!id) return null;

  const fullName = appointment.contact_name || appointment.trainee_name || `Appointment #${appointment.id}`;
  const { firstName, lastName } = splitName(fullName);

  return {
    id,
    username: '',
    email: '',
    phone: appointment.contact_phone || appointment.trainee_phone || '',
    ama_date: null,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    status: '',
    agency_code: '',
    parent_name: '',
    recruited_by_name: appointment.trainee_name || '',
    leader_name: appointment.assigned_to_name || '',
    recruited_by: appointment.trainee ?? null,
    parent: null,
    leader: appointment.assigned_to ?? null,
    level: null,
    roles: [],
    prospect_meta: emptyProspectMeta(),
    profile: {
      birthday: null,
      city: appointment.city || '',
      state: appointment.state || '',
      home_address: appointment.address || '',
      home_address2: '',
      home_city: appointment.city || '',
      home_zip: appointment.zip_code || '',
      phone: appointment.contact_phone || appointment.trainee_phone || '',
      gender: '',
      occupation: '',
      how_known: '',
      what_told: '',
    },
    created_at: appointment.created_at || '',
    updated_at: appointment.updated_at || '',
  };
}

export default function MatchupPage() {
  const addToast = useToastStore((state) => state.addToast);
  const location = useLocation();
  const navigate = useNavigate();
  const [preset, setPreset] = useState('all');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState<AppointmentKind | ''>('');
  const [typeSlug, setTypeSlug] = useState('');
  const [search, setSearch] = useState('');
  const [teamScope, setTeamScope] = useState<TrackerTeamScope>('baseshop');
  // Stable identity: TrackerTeamScopeFilter's scope-loading effect depends on
  // onChange, so an inline handler would re-run it every render (infinite loop).
  const handleScopeChange = useCallback(
    ({ scope }: { scope: TrackerTeamScope }) => setTeamScope(scope),
    [],
  );
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AppointmentListItem | null>(null);
  const [completeTarget, setCompleteTarget] = useState<AppointmentListItem | null>(null);
  const [editingTarget, setEditingTarget] = useState<AppointmentDetail | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<AppointmentDetail | null>(null);
  const [followUpDefaults, setFollowUpDefaults] = useState<Partial<FollowUpAppointmentDefaults> | null>(null);
  const [addAgencyCodeFor, setAddAgencyCodeFor] = useState<Prospect | null>(null);
  const [addProductionFor, setAddProductionFor] = useState<Prospect | null>(null);
  const [savingAgencyCode, setSavingAgencyCode] = useState(false);
  const [savingProduction, setSavingProduction] = useState(false);
  const [productionCompanyOptions, setProductionCompanyOptions] = useState<string[]>([]);
  const [productionProductsByCompany, setProductionProductsByCompany] = useState<Record<string, string[]>>({});
  const [productionSplitOptions, setProductionSplitOptions] = useState<string[]>([]);
  const [productionMultiplierTable, setProductionMultiplierTable] = useState<Record<string, number>>({});
  const [productionCompanyProductIds, setProductionCompanyProductIds] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [addProspectInitial, setAddProspectInitial] = useState<AddProspectFormData | null>(null);
  const [savingProspect, setSavingProspect] = useState(false);
  const [newAppointmentContact, setNewAppointmentContact] = useState<Prospect | null>(null);
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [noteDraftByAppointmentId, setNoteDraftByAppointmentId] = useState<Record<number, string>>({});
  const [savingNoteAppointmentIds, setSavingNoteAppointmentIds] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<{ userId: number; name: string } | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');
  const [savingModalNote, setSavingModalNote] = useState(false);
  const [contactProfileOpenFor, setContactProfileOpenFor] = useState<{ userId: number; name: string } | null>(null);

  const filters = useMemo<AppointmentFilters>(
    () => ({
      preset,
      status,
      kind,
      types: typeSlug,
      search,
      pageSize: 50,
      segment: teamScope.toUpperCase(),
    }),
    [kind, preset, search, status, typeSlug, teamScope],
  );

  const {
    appointments,
    calendarItems,
    actionRequired,
    appointmentTypes,
    statuses,
    presets,
    metrics,
    googleStatus,
    loading,
    loadingMore,
    error,
    reload,
    loadMore,
  } = useMatchupDashboard(filters, calendarMonth);

  useEffect(() => {
    const appointmentId = (location.state as { appointmentId?: number } | null)?.appointmentId;
    if (!appointmentId) return;
    setBusy(true);
    void matchupService.appointment(appointmentId)
      .then(setDetailsTarget)
      .catch((err) => addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load appointment.' }))
      .finally(() => setBusy(false));
    navigate(location.pathname, { replace: true, state: null });
  }, [addToast, location.pathname, location.state, navigate]);

  const addInlineAppointmentNote = async (appointmentId: number, userId: number) => {
    const text = (noteDraftByAppointmentId[appointmentId] || '').trim();
    if (!text) return;
    setSavingNoteAppointmentIds((current) => new Set(current).add(appointmentId));
    try {
      const created = await createTrackerNote(userId, text, 'matchup');
      setNotesByUserId((current) => ({ ...current, [userId]: [...(current[userId] || []), created] }));
      setNoteDraftByAppointmentId((current) => ({ ...current, [appointmentId]: '' }));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save note.' });
    } finally {
      setSavingNoteAppointmentIds((current) => {
        const next = new Set(current);
        next.delete(appointmentId);
        return next;
      });
    }
  };

  const addModalAppointmentNote = async () => {
    if (!notesOpenFor || !modalNoteDraft.trim()) return;
    try {
      setSavingModalNote(true);
      const created = await createTrackerNote(notesOpenFor.userId, modalNoteDraft, 'matchup');
      setNotesByUserId((current) => ({
        ...current,
        [notesOpenFor.userId]: [...(current[notesOpenFor.userId] || []), created],
      }));
      setModalNoteDraft('');
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save note.' });
    } finally {
      setSavingModalNote(false);
    }
  };

  const openAppointmentNotes = async (userId: number, name: string) => {
    setNotesOpenFor({ userId, name });
    setSavingModalNote(true);
    try {
      const notes = await fetchTrackerNotesForUser(userId, 'matchup');
      setNotesByUserId((current) => ({ ...current, [userId]: notes }));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load notes.' });
    } finally {
      setSavingModalNote(false);
    }
  };

  useEffect(() => {
    const loadProductionOptions = async () => {
      try {
        const [companyProducts, splitPresets] = await Promise.all([
          fetchProductionCompanyProducts(),
          fetchProductionSplitPresets(),
        ]);
        const companyOptions = new Set<string>();
        const productsByCompany: Record<string, Set<string>> = {};
        const multiplierTable: Record<string, number> = {};
        const companyProductIds: Record<string, number> = {};

        companyProducts.forEach((item) => {
          companyOptions.add(item.company_name);
          productsByCompany[item.company_name] = productsByCompany[item.company_name] || new Set<string>();
          productsByCompany[item.company_name].add(item.product_name);
          multiplierTable[`${item.company_name}|${item.product_name}`] = Number(item.multiplier) || 1;
          companyProductIds[`${item.company_name}|${item.product_name}`] = item.id;
        });

        setProductionCompanyOptions([...companyOptions]);
        setProductionProductsByCompany(
          Object.fromEntries(Object.entries(productsByCompany).map(([company, products]) => [company, [...products]])),
        );
        setProductionMultiplierTable(multiplierTable);
        setProductionCompanyProductIds(companyProductIds);
        setProductionSplitOptions(splitPresets.map((preset) => preset.label));
      } catch {
        setProductionCompanyOptions([]);
        setProductionProductsByCompany({});
        setProductionMultiplierTable({});
        setProductionCompanyProductIds({});
        setProductionSplitOptions([]);
      }
    };

    void loadProductionOptions();
  }, []);

  const runMutation = async (successMessage: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      addToast({ type: 'success', message: successMessage });
      await reload();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const saveAppointment = async (payload: CreateAppointmentPayload, id?: number) => {
    await runMutation(id ? 'Appointment updated.' : 'Appointment created.', async () => {
      if (id) {
        await matchupService.updateAppointment(id, payload);
      } else {
        await matchupService.createAppointment(payload);
      }
      setFormOpen(false);
      setEditingTarget(null);
      setFollowUpDefaults(null);
      setNewAppointmentContact(null);
    });
  };

  const openAddProspect = (searchedName: string) => {
    const { firstName, lastName } = splitName(searchedName);
    setAddProspectInitial({ ...defaultAddProspectForm, firstName, lastName });
  };

  const submitNewProspect = async (form: AddProspectFormData) => {
    try {
      setSavingProspect(true);
      const created = await createProspect({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        recruited_by: form.recruiterId,
        leader: form.leaderId,
        profile: {
          state: form.state || undefined,
          home_address: form.homeAddress || undefined,
          home_address2: form.homeAddress2,
          home_city: form.homeCity || undefined,
          home_zip: form.homeZip || undefined,
          birthday: form.birthday || null,
          gender: form.gender || undefined,
          occupation: form.occupation || undefined,
          how_known: form.howKnown || undefined,
          what_told: form.whatTold || undefined,
          relationship: form.relationship ? Number(form.relationship) : null,
          dependent_children: form.dependentKids,
          flags: {
            age25Plus: form.age25Plus, homeowner: form.homeowner, solidCareer: form.solidCareer,
            income75kPlus: form.income75kPlus, dissatisfied: form.dissatisfied,
            entrepreneurial: form.entrepreneurial, spanishPreferred: form.spanishPreferred,
            married: form.married, dependentKids: form.dependentKids, language: form.language,
          },
        },
        prospect_meta: { outcome: 'Both', mark: 'default', hot: false, top25: false },
      });
      setNewAppointmentContact(created);
      setAddProspectInitial(null);
      addToast({ type: 'success', message: 'Prospect added and selected as the appointment contact.' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add prospect.' });
    } finally {
      setSavingProspect(false);
    }
  };

  const assignTrainer = async (trainerId: number) => {
    if (!assignTarget) return;
    await runMutation('Trainer assigned.', async () => {
      await matchupService.assign(assignTarget.id, trainerId);
      setAssignTarget(null);
    });
  };

  const completeAppointment = async (payload: CompleteAppointmentPayload) => {
    if (!completeTarget) return;
    await runMutation('Appointment completed.', async () => {
      await matchupService.complete(completeTarget.id, payload);
      setCompleteTarget(null);
    });
  };

  const acceptAppointment = async (appointment: AppointmentListItem) => {
    await runMutation('Appointment accepted.', async () => {
      await matchupService.accept(appointment.id);
    });
  };

  const declineAppointment = async (appointment: AppointmentListItem) => {
    const reason = window.prompt('Optional decline reason') || '';
    await runMutation('Appointment declined.', async () => {
      await matchupService.decline(appointment.id, reason);
    });
  };

  const cancelAppointment = async (appointment: AppointmentListItem) => {
    if (!window.confirm('Cancel this appointment?')) return;
    await runMutation('Appointment cancelled.', async () => {
      await matchupService.cancel(appointment.id);
    });
  };

  const connectGoogle = async () => {
    await runMutation('Redirecting to Google Calendar setup.', async () => {
      const response = await matchupService.startGoogleOAuth();
      window.location.href = response.authorization_url;
    });
  };

  const disconnectGoogle = async () => {
    await runMutation('Google Calendar disconnected.', async () => {
      await matchupService.disconnectGoogle();
    });
  };

  const exportAppointments = async () => {
    await runMutation('Export started.', async () => {
      await matchupService.downloadExport(filters);
    });
  };

  const openRecruitTrackerModal = (appointment: AppointmentListItem) => {
    const prospect = prospectFromAppointment(appointment);
    if (!prospect) {
      addToast({ type: 'warning', message: 'No contact found for this appointment.' });
      return;
    }
    setAddAgencyCodeFor(prospect);
  };

  const openFollowUpAppointmentModal = (appointment: AppointmentListItem) => {
    const nextStart = new Date(appointment.start_at);
    nextStart.setDate(nextStart.getDate() + 7);
    setFollowUpDefaults({
      kind: appointment.kind,
      start_at: `${nextStart.getFullYear()}-${String(nextStart.getMonth() + 1).padStart(2, '0')}-${String(nextStart.getDate()).padStart(2, '0')}T${String(nextStart.getHours()).padStart(2, '0')}:${String(nextStart.getMinutes()).padStart(2, '0')}`,
      timezone: appointment.timezone,
      duration_minutes: appointment.duration_minutes,
      types: appointment.types.map((type) => type.id),
      location_type: appointment.location_type,
      url: appointment.url || '',
      url_nickname: appointment.url_nickname || '',
      address: appointment.address || '',
      city: appointment.city || '',
      state: appointment.state || '',
      zip_code: appointment.zip_code || '',
      country: appointment.country || 'USA',
      contact: appointment.contact ?? null,
      contactLabel: appointment.contact_name || '',
      contact_phone: appointment.contact_phone || '',
      contact_spouse_name: appointment.contact_spouse_name || '',
      trainee: appointment.trainee ?? null,
      traineeLabel: appointment.trainee_name || '',
      trainee_phone: appointment.trainee_phone || '',
    });
    setEditingTarget(null);
    setFormOpen(true);
  };

  const openProductionModal = (appointment: AppointmentListItem) => {
    const prospect = prospectFromAppointment(appointment);
    if (!prospect) {
      addToast({ type: 'warning', message: 'No contact found for this appointment.' });
      return;
    }
    setAddProductionFor(prospect);
  };

  const submitAgencyCode = async (formData: AddAgentFormData) => {
    if (!addAgencyCodeFor) return;
    try {
      setSavingAgencyCode(true);
      const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
      await updateProspectDetails(addAgencyCodeFor.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName || undefined,
        phone: formData.phone,
        email: formData.email,
        ama_date: formData.amaDate,
        polo_size: formData.poloSize,
        level_id: formData.level ?? undefined,
        spouse_name: formData.spouseName,
        spouse_phone: formData.spousePhone,
        spouse_polo_size: formData.spousePoloSize,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
        profile: {
          birthday: formData.dateOfBirth || null,
          state: formData.state || undefined,
          home_address: formData.homeAddress || undefined,
          home_address2: formData.homeAddress2.trim(),
          home_city: formData.homeCity || undefined,
          home_zip: formData.homeZip || undefined,
        },
      });
      await activateProspectWithAgencyCode(addAgencyCodeFor.id, formData.agencyCode.trim());
      setAddAgencyCodeFor(null);
      addToast({ type: 'success', message: 'Agency code added successfully.' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add agency code.' });
    } finally {
      setSavingAgencyCode(false);
    }
  };

  const submitProduction = async (data: AddProductionFormData) => {
    if (!addProductionFor) return;
    try {
      setSavingProduction(true);
      const [pA, pB] = data.split.split('/').map((value) => parseFloat(value) || 0);
      const base = parseFloat(data.targetPoints) || 0;
      const isOther = data.company === 'OTHER' || data.product === 'OTHER';
      const companyProductId = isOther ? null : (productionCompanyProductIds[`${data.company}|${data.product}`] ?? null);
      const pointsTarget = isOther
        ? Math.round(base * (parseFloat(data.multiplierPercent) || 1) * 100) / 100
        : base;

      await createProductionRecord({
        prospect: addProductionFor.id,
        client_name: data.client,
        company_product_id: companyProductId,
        date_written: data.dateWritten || null,
        closure_date: data.closureDate || null,
        delivery: data.delivery,
        status: data.status,
        notes: data.notes,
        trial_app: data.trialApp,
        policy_number: data.policyNumber,
        points_target: pointsTarget,
        agent_1: data.agent1Id,
        agent_1_name: data.agent1Name,
        agent_1_pct: pA,
        agent_2: data.agentMode === 'split' ? data.agent2Id : null,
        agent_2_name: data.agentMode === 'split' ? data.agent2Name : '',
        agent_2_pct: data.agentMode === 'split' ? pB : 0,
        split_mode: data.agentMode === 'split' ? 'split' : 'solo',
      });
      setAddProductionFor(null);
      addToast({ type: 'success', message: 'Added to Production Tracker.' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add production.' });
    } finally {
      setSavingProduction(false);
    }
  };

  const openAppointmentForEdit = async (appointment: AppointmentListItem) => {
    setBusy(true);
    try {
      const detail = await matchupService.appointment(appointment.id);
      setEditingTarget(detail);
      setFormOpen(true);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load appointment details.' });
    } finally {
      setBusy(false);
    }
  };

  const openAppointmentDetailsById = async (id: number) => {
    setBusy(true);
    try {
      setDetailsTarget(await matchupService.appointment(id));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load appointment details.' });
    } finally {
      setBusy(false);
    }
  };

  const openAppointmentDetails = (appointment: AppointmentListItem) => openAppointmentDetailsById(appointment.id);

  return (
    <main className="matchup-page">
      <header className="matchup-hero">
        <div>
          <span>Matchup</span>
          <h1>Appointments and Trainer Matching</h1>
          <p>Request trainers, manage outcomes, and keep the matchup calendar moving.</p>
        </div>
        <div className="matchup-header-controls">
          <div className="matchup-hero-actions">
            <TrackerTeamScopeFilter
              segmentOnly
              value={teamScope}
              selectedUserId={null}
              onChange={handleScopeChange}
            />
            <Button variant="outline" onClick={() => void (googleStatus?.connected ? disconnectGoogle() : connectGoogle())} disabled={busy}>
              <CalendarCheck size={16} /> {googleStatus?.connected ? 'Disconnect Google' : 'Connect Google'}
            </Button>
            <Button onClick={() => { setEditingTarget(null); setFollowUpDefaults(null); setNewAppointmentContact(null); setFormOpen(true); }}>
              <Plus size={16} /> New Appointment
            </Button>
          </div>
        </div>
      </header>

      {error ? <div className="matchup-page-error">{error}</div> : null}

      <MetricsCards metrics={metrics} />

      <MonthCalendar
        month={calendarMonth}
        items={calendarItems}
        appointmentItems={[...appointments.results, ...actionRequired]}
        statuses={statuses}
        selectedDate={selectedDate}
        segment={filters.segment}
        onMonthChange={setCalendarMonth}
        onDateSelect={setSelectedDate}
        onItemClick={(id) => void openAppointmentDetailsById(id)}
      />

      <div className="matchup-lower-layout">
        <aside className="matchup-sidebar-panel">
          <ActionRequiredPanel
            items={actionRequired}
            statuses={statuses}
            onAssign={setAssignTarget}
            onAccept={(item) => void acceptAppointment(item)}
            onDecline={(item) => void declineAppointment(item)}
            onView={(item) => void openAppointmentDetails(item)}
            busy={busy}
          />
        </aside>

        <section className="matchup-content">
          <div className="matchup-filter-bar">
            <Input variant="surface" placeholder="Search contact, trainee, trainer..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={preset} onChange={(event) => setPreset(event.target.value)}>
              {presets.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
            <Select value={kind} onChange={(event) => setKind(event.target.value as AppointmentKind | '')}>
              <option value="">All kinds</option>
              <option value="REQUEST_TRAINER">Request Trainer</option>
              <option value="PERSONAL">Personal</option>
            </Select>
            <Select value={typeSlug} onChange={(event) => setTypeSlug(event.target.value)}>
              <option value="">All types</option>
              {appointmentTypes.map((type) => <option key={type.id} value={type.slug}>{type.name}</option>)}
            </Select>
          </div>
          <AppointmentList
            items={appointments.results}
            count={appointments.count}
            statuses={statuses}
            loading={loading}
            onOpen={(item) => void openAppointmentForEdit(item)}
            onViewDetails={(item) => void openAppointmentDetails(item)}
            onOpenContact={(userId, name) => setContactProfileOpenFor({ userId, name })}
            onAssign={setAssignTarget}
            onComplete={setCompleteTarget}
            onCancel={(item) => void cancelAppointment(item)}
            onExport={() => void exportAppointments()}
            hasMore={Boolean(appointments.next)}
            loadingMore={loadingMore}
            onLoadMore={() => void loadMore()}
            noteDraftByAppointmentId={noteDraftByAppointmentId}
            savingNoteAppointmentIds={savingNoteAppointmentIds}
            onNoteDraftChange={(appointmentId, value) => setNoteDraftByAppointmentId((current) => ({ ...current, [appointmentId]: value }))}
            onAddNote={(appointmentId, userId) => void addInlineAppointmentNote(appointmentId, userId)}
            onOpenNotes={(userId, name) => void openAppointmentNotes(userId, name)}
          />
        </section>
      </div>

      <AssignTrainerModal
        open={Boolean(assignTarget)}
        appointment={assignTarget}
        saving={busy}
        onClose={() => setAssignTarget(null)}
        onAssign={assignTrainer}
      />
      <CompleteAppointmentModal
        open={Boolean(completeTarget)}
        appointment={completeTarget}
        saving={busy}
        onClose={() => setCompleteTarget(null)}
        onComplete={completeAppointment}
        onAddToRecruitTracker={openRecruitTrackerModal}
        onCreateFollowUpAppointment={openFollowUpAppointmentModal}
        onAddToProduction={openProductionModal}
      />
      <AppointmentFormModal
        open={formOpen}
        appointment={editingTarget}
        initialValues={followUpDefaults}
        appointmentTypes={appointmentTypes}
        saving={busy}
        onClose={() => { setFormOpen(false); setEditingTarget(null); setFollowUpDefaults(null); setNewAppointmentContact(null); }}
        onSubmit={saveAppointment}
        onAddProspect={openAddProspect}
        addedContact={newAppointmentContact}
      />
      <AppointmentDetailsModal appointment={detailsTarget} onClose={() => setDetailsTarget(null)} />
      <ProspectDetailsModal
        open={Boolean(contactProfileOpenFor)}
        prospectId={contactProfileOpenFor?.userId ?? null}
        fallbackName={contactProfileOpenFor?.name}
        onClose={() => setContactProfileOpenFor(null)}
      />
      <AddProspectModal
        open={Boolean(addProspectInitial)}
        saving={savingProspect}
        initialForm={addProspectInitial}
        onClose={() => setAddProspectInitial(null)}
        onSubmit={submitNewProspect}
      />
      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes - ${notesOpenFor?.name || ''}`}
        notes={notesOpenFor ? notesByUserId[notesOpenFor.userId] || [] : []}
        draft={modalNoteDraft}
        saving={savingModalNote}
        onClose={() => { setNotesOpenFor(null); setModalNoteDraft(''); }}
        onDraftChange={setModalNoteDraft}
        onAddNote={addModalAppointmentNote}
      />
      <AddAgencyCodeModal
        prospect={addAgencyCodeFor}
        saving={savingAgencyCode}
        onClose={() => setAddAgencyCodeFor(null)}
        onSubmit={submitAgencyCode}
      />
      <AddProductionModal
        open={Boolean(addProductionFor)}
        saving={savingProduction}
        prospect={addProductionFor}
        companyOptions={productionCompanyOptions}
        productsByCompany={productionProductsByCompany}
        splitOptions={productionSplitOptions}
        multiplierTable={productionMultiplierTable}
        onClose={() => setAddProductionFor(null)}
        onSubmit={submitProduction}
      />
    </main>
  );
}
