import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmationDialog, Modal, TrackerTable } from '@/shared/components';
import {
  activateProspectWithAgencyCode,
  deleteProspect,
  saveProspectCallLog,
  sendProspectInvitation,
  updateProspectDetails,
  type Prospect,
} from '@/features/team/prospect/services/prospect-service';
import { buildProspectColumns } from '@/features/team/prospect/prospect-columns';
import { AddAgencyCodeModal } from '@/features/team/prospect/components/add-agency-code-modal';
import {
  AddProductionModal,
  type AddProductionFormData,
} from '@/features/team/prospect/components/add-production-modal';
import { AddProspectModal } from '@/features/team/prospect/components/add-prospect-modal';
import { CallLogModal } from '@/features/team/prospect/components/call-log-modal';
import type { AddAgentFormData, AddProspectFormData } from '@/features/team/prospect/types';
import {
  createProductionRecord,
  fetchProductionCompanyProducts,
  fetchProductionSplitPresets,
} from '@/features/team/production-tracker/services/production-tracker-service';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import {
  resolveTrackerUserIdByName,
  type TrackerUserProfile,
} from '@/features/team/services/tracker-user-profile-service';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import { TrackerUserProfileModal } from '@/features/team/components/tracker-user-profile-modal';
import { useToastStore } from '@/store';

type ProspectMark = 'default' | 'client' | 'recruit' | 'both';
type ProspectOutcome = 'Client' | 'Recruit' | 'Both';

export interface ProspectTrackerListUser {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  agency_code?: string | null;
  leader_name?: string | null;
  recruited_by_name?: string | null;
  latest_note_text?: string | null;
  latest_note_created_by_name?: string | null;
  latest_note_created_at?: string | null;
  plan?: string | null;
  user_type?: string | null;
  type?: string | null;
  level?: {
    id?: number;
    code?: string;
    rank?: number;
    name?: string;
    description?: string;
  } | null;
  profile?: Record<string, any> | null;
  agent_meta?: {
    outcome?: string | null;
  } | null;
  prospect_meta?: Record<string, any> | null;
}

export interface ProspectTrackerListModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: ProspectTrackerListUser[];
  title: string;
  introText: string;
  loadingText: string;
  emptyText: string;
  onClose: () => void;
}

function fullNameOf(user: ProspectTrackerListUser): string {
  const full = user.full_name?.trim();
  if (full) return full;
  const combined = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return combined || `User #${user.id}`;
}

function normalizeMarkValue(value?: string | null): ProspectMark {
  const raw = (value || '').toLowerCase();
  if (raw === 'client' || raw === 'green') return 'client';
  if (raw === 'recruit' || raw === 'yellow') return 'recruit';
  if (raw === 'both' || raw === 'combined') return 'both';
  return 'default';
}

function normalizeOutcomeValue(value?: string | null): ProspectOutcome {
  const raw = (value || '').toLowerCase();
  if (raw === 'client') return 'Client';
  if (raw === 'recruit' || raw === 'recruiter') return 'Recruit';
  return 'Both';
}

function ageFromBirthday(value?: string | null): string {
  if (!value) return '';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 ? String(age) : '';
}

function birthdayFromAge(value: string): string | undefined {
  const age = Number.parseInt(value, 10);
  if (!Number.isFinite(age) || age <= 0) return undefined;

  const today = new Date();
  const year = today.getFullYear() - age;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toProspect(user: ProspectTrackerListUser): Prospect {
  const raw = user as ProspectTrackerListUser & Record<string, any>;
  const fullName = fullNameOf(user);
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = user.first_name || nameParts[0] || '';
  const lastName = user.last_name || nameParts.slice(1).join(' ');
  const prospectMeta = (raw.prospect_meta || {}) as Record<string, any>;
  const profile = (raw.profile || {}) as Record<string, any>;

  return {
    id: user.id,
    username: raw.username || String(user.id),
    email: user.email || '',
    phone: user.phone || '',
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    status: raw.status || '',
    latest_note_text: user.latest_note_text ?? null,
    latest_note_tracker: raw.latest_note_tracker ?? null,
    latest_note_created_at: user.latest_note_created_at ?? null,
    latest_note_created_by_name: user.latest_note_created_by_name ?? null,
    agency_code: user.agency_code || '',
    parent_name: raw.parent_name || '',
    recruited_by_name: user.recruited_by_name || '',
    leader_name: user.leader_name || '',
    recruited_by: raw.recruited_by ?? raw.recruiter_id ?? null,
    parent: raw.parent ?? raw.recruited_by ?? null,
    leader: raw.leader ?? raw.leader_id ?? null,
    level: user.level
      ? {
          id: user.level.id ?? 0,
          code: user.level.code || '',
          rank: user.level.rank ?? 0,
          name: user.level.name || '',
          description: user.level.description || '',
        }
      : null,
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    prospect_meta: {
      notes: prospectMeta.notes || '',
      hot: Boolean(prospectMeta.hot),
      top25: Boolean(prospectMeta.top25),
      outcome: prospectMeta.outcome || user.agent_meta?.outcome || '',
      mark: prospectMeta.mark || 'default',
      files: prospectMeta.files || [],
      source_date: prospectMeta.source_date ?? null,
    },
    profile: {
      birthday: profile.birthday ?? null,
      city: profile.city || '',
      state: profile.state || '',
      phone: profile.phone || user.phone || '',
      gender: profile.gender || '',
      occupation: profile.occupation || '',
      how_known: profile.how_known || '',
      what_told: profile.what_told || '',
      relationship: profile.relationship ?? null,
      dependent_children: profile.dependent_children ?? profile.flags?.dependentKids ?? false,
      flags: profile.flags || {},
    },
    created_at: user.created_at || raw.created_at || '',
    updated_at: raw.updated_at || user.created_at || '',
  };
}

function mapProspectToForm(prospect: Prospect): AddProspectFormData {
  return {
    firstName: prospect.first_name || '',
    lastName: prospect.last_name || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    recruiter: prospect.recruited_by_name || '',
    recruiterId: prospect.recruited_by ?? null,
    leader: prospect.leader_name || '',
    leaderId: prospect.leader ?? null,
    gender: prospect.profile?.gender || '',
    state: prospect.profile?.state || '',
    birthday: prospect.profile?.birthday || '',
    howKnown: prospect.profile?.how_known || '',
    relationship:
      prospect.profile?.relationship !== undefined && prospect.profile?.relationship !== null
        ? String(prospect.profile.relationship)
        : '',
    occupation: prospect.profile?.occupation || '',
    whatTold: prospect.profile?.what_told || '',
    age25Plus: Boolean(prospect.profile?.flags?.age25Plus),
    homeowner: Boolean(prospect.profile?.flags?.homeowner),
    solidCareer: Boolean(prospect.profile?.flags?.solidCareer),
    income75kPlus: Boolean(prospect.profile?.flags?.income75kPlus),
    dissatisfied: Boolean(prospect.profile?.flags?.dissatisfied),
    entrepreneurial: Boolean(prospect.profile?.flags?.entrepreneurial),
    spanishPreferred: Boolean(prospect.profile?.flags?.spanishPreferred),
    married: Boolean(prospect.profile?.flags?.married),
    dependentKids: Boolean(prospect.profile?.flags?.dependentKids),
  };
}

export function ProspectTrackerListModal({
  open,
  ownerName,
  loading,
  users,
  title,
  introText,
  loadingText,
  emptyText,
  onClose,
}: ProspectTrackerListModalProps) {
  const addToast = useToastStore((state) => state.addToast);

  const [rows, setRows] = useState<Prospect[]>([]);
  const [activeCallLogProspect, setActiveCallLogProspect] = useState<Prospect | null>(null);
  const [addAgencyCodeFor, setAddAgencyCodeFor] = useState<Prospect | null>(null);
  const [addProductionFor, setAddProductionFor] = useState<Prospect | null>(null);
  const [savingCallLog, setSavingCallLog] = useState(false);
  const [savingProduction, setSavingProduction] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [pendingDeleteProspect, setPendingDeleteProspect] = useState<Prospect | null>(null);

  const [productionCompanyOptions, setProductionCompanyOptions] = useState<string[]>([]);
  const [productionProductsByCompany, setProductionProductsByCompany] =
    useState<Record<string, string[]>>({});
  const [productionSplitOptions, setProductionSplitOptions] = useState<string[]>([]);
  const [productionMultiplierTable, setProductionMultiplierTable] =
    useState<Record<string, number>>({});
  const [productionCompanyProductIds, setProductionCompanyProductIds] =
    useState<Record<string, number>>({});

  const [savingMetaProspectIdSet, setSavingMetaProspectIdSet] = useState<Set<number>>(new Set());
  const [savingNoteProspectIdSet, setSavingNoteProspectIdSet] = useState<Set<number>>(new Set());
  const [loadingNoteProspectIdSet, setLoadingNoteProspectIdSet] = useState<Set<number>>(new Set());
  const [notesByProspectId, setNotesByProspectId] = useState<Record<number, TrackerNote[]>>({});
  const [noteDraftByProspectId, setNoteDraftByProspectId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [notesOpenFor, setNotesOpenFor] = useState<Prospect | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');

  const [editingProfileProspectId, setEditingProfileProspectId] = useState<number | null>(null);
  const [profileDraftByProspectId, setProfileDraftByProspectId] = useState<
    Record<
      number,
      {
        howKnown: string;
        relationship: string;
        occupation: string;
        age: string;
        whatTold: string;
        married: boolean;
        dependentKids: boolean;
      }
    >
  >({});
  const [profileOpenFor, setProfileOpenFor] = useState<{
    userId: number;
    userName: string;
    avatarUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    setRows(users.map(toProspect));
  }, [users]);

  useEffect(() => {
    if (!open) {
      setActiveCallLogProspect(null);
      setAddAgencyCodeFor(null);
      setAddProductionFor(null);
      setEditingProspect(null);
      setPendingDeleteProspect(null);
      setNotesOpenFor(null);
      setModalNoteDraft('');
      setFocusedNoteInputId(null);
      setEditingProfileProspectId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const loadProductionOptions = async () => {
      try {
        const [companyProducts, splitPresets] = await Promise.all([
          fetchProductionCompanyProducts(),
          fetchProductionSplitPresets(),
        ]);
        if (!isMounted) return;

        const nextProductsByCompany: Record<string, string[]> = {};
        const nextMultiplierTable: Record<string, number> = {};
        const nextCompanyOptions = new Set<string>();
        const nextProductIds: Record<string, number> = {};

        companyProducts.forEach((item) => {
          nextCompanyOptions.add(item.company_name);
          nextProductsByCompany[item.company_name] = nextProductsByCompany[item.company_name] || [];
          if (!nextProductsByCompany[item.company_name].includes(item.product_name)) {
            nextProductsByCompany[item.company_name] = [
              ...nextProductsByCompany[item.company_name],
              item.product_name,
            ];
          }

          const multiplier = Number(item.multiplier);
          nextMultiplierTable[`${item.company_name}|${item.product_name}`] =
            Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
          nextProductIds[`${item.company_name}|${item.product_name}`] = item.id;
        });

        const nextSplitOptions = new Set<string>();
        splitPresets.forEach((preset) => {
          if (!Array.isArray(preset.splits) || preset.splits.length < 2) return;
          const option = `${preset.splits[0]}/${preset.splits[1]}`;
          if (option !== '100/0') nextSplitOptions.add(option);
        });

        setProductionCompanyOptions(Array.from(nextCompanyOptions));
        setProductionProductsByCompany(nextProductsByCompany);
        setProductionMultiplierTable(nextMultiplierTable);
        setProductionCompanyProductIds(nextProductIds);
        setProductionSplitOptions(Array.from(nextSplitOptions));
      } catch {
        if (!isMounted) return;
        addToast({ type: 'error', message: 'Failed to load production options.' });
      }
    };

    void loadProductionOptions();

    return () => {
      isMounted = false;
    };
  }, [addToast, open]);

  const updateProspectInState = useCallback((updated: Prospect) => {
    setRows((prev) =>
      prev.map((item) => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item))
    );
    setActiveCallLogProspect((prev) =>
      prev && String(prev.id) === String(updated.id) ? { ...prev, ...updated } : prev
    );
  }, []);

  const ensureNotesLoaded = useCallback(
    async (userId: number) => {
      if (notesByProspectId[userId]) return;
      setLoadingNoteProspectIdSet((prev) => new Set(prev).add(userId));
      try {
        const loaded = await fetchTrackerNotesForUser(userId, 'prospect');
        setNotesByProspectId((prev) => ({ ...prev, [userId]: loaded }));
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load notes.',
        });
      } finally {
        setLoadingNoteProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [addToast, notesByProspectId]
  );

  const handleNoteDraftChange = useCallback((prospectId: number, value: string) => {
    setNoteDraftByProspectId((prev) => ({ ...prev, [prospectId]: value }));
  }, []);

  const handleAddInlineNote = useCallback(
    async (row: Prospect) => {
      const draft = (noteDraftByProspectId[row.id] || '').trim();
      if (!draft) return;

      setSavingNoteProspectIdSet((prev) => new Set(prev).add(row.id));
      try {
        const created = await createTrackerNote(row.id, draft, 'prospect');
        setNotesByProspectId((prev) => {
          const current = prev[row.id] || [];
          return { ...prev, [row.id]: [...current, created] };
        });
        setNoteDraftByProspectId((prev) => ({ ...prev, [row.id]: '' }));
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to save note.',
        });
      } finally {
        setSavingNoteProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast, noteDraftByProspectId]
  );

  const handleAddModalNote = useCallback(async () => {
    if (!notesOpenFor) return;
    const text = modalNoteDraft.trim();
    if (!text) return;

    setSavingNoteProspectIdSet((prev) => new Set(prev).add(notesOpenFor.id));
    try {
      const created = await createTrackerNote(notesOpenFor.id, text, 'prospect');
      setNotesByProspectId((prev) => {
        const current = prev[notesOpenFor.id] || [];
        return { ...prev, [notesOpenFor.id]: [...current, created] };
      });
      setModalNoteDraft('');
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save note.',
      });
    } finally {
      setSavingNoteProspectIdSet((prev) => {
        const next = new Set(prev);
        next.delete(notesOpenFor.id);
        return next;
      });
    }
  }, [addToast, modalNoteDraft, notesOpenFor]);

  const handleToggleProspectMeta = useCallback(
    async (row: Prospect, field: 'top25' | 'hot', value: boolean) => {
      setSavingMetaProspectIdSet((prev) => new Set(prev).add(row.id));
      const previous = row.prospect_meta;
      const nextMeta = {
        notes: previous?.notes || '',
        hot: field === 'hot' ? value : Boolean(previous?.hot),
        top25: field === 'top25' ? value : Boolean(previous?.top25),
        outcome: previous?.outcome || '',
        mark: normalizeMarkValue(previous?.mark),
        files: previous?.files || [],
        source_date: previous?.source_date ?? null,
      };

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, prospect_meta: { ...(item.prospect_meta || {}), ...nextMeta } } : item
        )
      );

      try {
        const updated = await updateProspectDetails(row.id, { prospect_meta: nextMeta });
        updateProspectInState(updated);
      } catch (err) {
        setRows((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, prospect_meta: previous ?? null } : item))
        );
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update prospect flags.',
        });
      } finally {
        setSavingMetaProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast, updateProspectInState]
  );

  const handleChangeProspectMark = useCallback(
    async (row: Prospect, mark: ProspectMark) => {
      setSavingMetaProspectIdSet((prev) => new Set(prev).add(row.id));
      const previous = row.prospect_meta;
      const nextMeta = {
        notes: previous?.notes || '',
        hot: Boolean(previous?.hot),
        top25: Boolean(previous?.top25),
        outcome: previous?.outcome || '',
        mark: normalizeMarkValue(mark),
        files: previous?.files || [],
        source_date: previous?.source_date ?? null,
      };

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, prospect_meta: { ...(item.prospect_meta || {}), ...nextMeta } } : item
        )
      );

      try {
        const updated = await updateProspectDetails(row.id, { prospect_meta: nextMeta });
        updateProspectInState(updated);
      } catch (err) {
        setRows((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, prospect_meta: previous ?? null } : item))
        );
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update marker.',
        });
      } finally {
        setSavingMetaProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast, updateProspectInState]
  );

  const handleChangeProspectOutcome = useCallback(
    async (row: Prospect, outcome: ProspectOutcome) => {
      setSavingMetaProspectIdSet((prev) => new Set(prev).add(row.id));
      const previous = row.prospect_meta;
      const nextMeta = {
        notes: previous?.notes || '',
        hot: Boolean(previous?.hot),
        top25: Boolean(previous?.top25),
        outcome: normalizeOutcomeValue(outcome),
        mark: normalizeMarkValue(previous?.mark),
        files: previous?.files || [],
        source_date: previous?.source_date ?? null,
      };

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, prospect_meta: { ...(item.prospect_meta || {}), ...nextMeta } } : item
        )
      );

      try {
        const updated = await updateProspectDetails(row.id, { prospect_meta: nextMeta });
        updateProspectInState(updated);
      } catch (err) {
        setRows((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, prospect_meta: previous ?? null } : item))
        );
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update outcome.',
        });
      } finally {
        setSavingMetaProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast, updateProspectInState]
  );

  const handleStartProfileEdit = useCallback((row: Prospect) => {
    setEditingProfileProspectId(row.id);
    setProfileDraftByProspectId((prev) => ({
      ...prev,
      [row.id]: {
        howKnown: row.profile?.how_known || '',
        relationship:
          row.profile?.relationship !== undefined && row.profile?.relationship !== null
            ? String(row.profile.relationship)
            : '',
        occupation: row.profile?.occupation || '',
        age: ageFromBirthday(row.profile?.birthday),
        whatTold: row.profile?.what_told || '',
        married: Boolean(row.profile?.flags?.married),
        dependentKids: Boolean(row.profile?.flags?.dependentKids || row.profile?.dependent_children),
      },
    }));
  }, []);

  const handleProfileDraftFieldChange = useCallback(
    (
      prospectId: number,
      field: 'howKnown' | 'relationship' | 'occupation' | 'age' | 'whatTold',
      value: string
    ) => {
      setProfileDraftByProspectId((prev) => ({
        ...prev,
        [prospectId]: {
          ...(prev[prospectId] || {
            howKnown: '',
            relationship: '',
            occupation: '',
            age: '',
            whatTold: '',
            married: false,
            dependentKids: false,
          }),
          [field]: value,
        },
      }));
    },
    []
  );

  const handleProfileDraftFlagChange = useCallback(
    (prospectId: number, field: 'married' | 'dependentKids', value: boolean) => {
      setProfileDraftByProspectId((prev) => ({
        ...prev,
        [prospectId]: {
          ...(prev[prospectId] || {
            howKnown: '',
            relationship: '',
            occupation: '',
            age: '',
            whatTold: '',
            married: false,
            dependentKids: false,
          }),
          [field]: value,
        },
      }));
    },
    []
  );

  const handleSaveProfileEdit = useCallback(
    async (row: Prospect) => {
      const draft = profileDraftByProspectId[row.id];
      if (!draft) return;

      setSavingMetaProspectIdSet((prev) => new Set(prev).add(row.id));
      try {
        const updated = await updateProspectDetails(row.id, {
          profile: {
            ...(row.profile || {}),
            birthday: birthdayFromAge(draft.age) || row.profile?.birthday || undefined,
            occupation: draft.occupation || undefined,
            how_known: draft.howKnown || undefined,
            what_told: draft.whatTold || undefined,
            relationship: draft.relationship ? Number(draft.relationship) : null,
            dependent_children: draft.dependentKids,
            flags: {
              ...(row.profile?.flags || {}),
              married: draft.married,
              dependentKids: draft.dependentKids,
            },
          },
        });
        updateProspectInState(updated);
        setEditingProfileProspectId(null);
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update profile.',
        });
      } finally {
        setSavingMetaProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast, profileDraftByProspectId, updateProspectInState]
  );

  const handleOpenRelatedProfile = useCallback(
    async (row: Prospect, kind: 'leader' | 'recruiter') => {
      const userId = kind === 'leader' ? row.leader : row.recruited_by;
      const userName = kind === 'leader' ? row.leader_name : row.recruited_by_name;
      let resolvedId = userId;

      if (!resolvedId && userName) {
        resolvedId = await resolveTrackerUserIdByName(userName);
      }

      if (!resolvedId) {
        addToast({ type: 'warning', message: 'Could not find this user profile.' });
        return;
      }

      setProfileOpenFor({ userId: resolvedId, userName: userName || 'User' });
    },
    [addToast]
  );

  const handleUpdateProspect = async (formData: AddProspectFormData) => {
    if (!editingProspect) return;

    try {
      setSavingCallLog(true);
      const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
      const updated = await updateProspectDetails(editingProspect.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName || undefined,
        email: formData.email,
        phone: formData.phone,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
        profile: {
          state: formData.state || undefined,
          birthday: formData.birthday || undefined,
          gender: formData.gender || undefined,
          occupation: formData.occupation || undefined,
          how_known: formData.howKnown || undefined,
          what_told: formData.whatTold || undefined,
          relationship: formData.relationship ? Number(formData.relationship) : null,
          dependent_children: formData.dependentKids,
          flags: {
            age25Plus: formData.age25Plus,
            homeowner: formData.homeowner,
            solidCareer: formData.solidCareer,
            income75kPlus: formData.income75kPlus,
            dissatisfied: formData.dissatisfied,
            entrepreneurial: formData.entrepreneurial,
            spanishPreferred: formData.spanishPreferred,
            married: formData.married,
            dependentKids: formData.dependentKids,
          },
        },
      });

      updateProspectInState(updated);
      setEditingProspect(null);
      addToast({ type: 'success', message: 'Prospect updated successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update prospect.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleSaveCallLog = async (outcome: string, note: string) => {
    if (!activeCallLogProspect) return;

    try {
      setSavingCallLog(true);
      const updated = await saveProspectCallLog(activeCallLogProspect, outcome, note);
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
      addToast({ type: 'success', message: 'Call log saved.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save call log.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleInviteProspect = async (prospect: Prospect) => {
    try {
      setSavingCallLog(true);
      await sendProspectInvitation(prospect);
      addToast({ type: 'success', message: 'Invitation sent successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send invitation.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleAddAgencyCode = async (prospect: Prospect) => {
    setAddAgencyCodeFor(prospect);
  };

  const handleSubmitAddAgencyCode = async (formData: AddAgentFormData) => {
    if (!addAgencyCodeFor) return;

    try {
      setSavingCallLog(true);
      const updatedDetails = await updateProspectDetails(addAgencyCodeFor.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        ama_date: formData.amaDate,
        polo_size: formData.poloSize,
        level_id: formData.level,
        spouse_name: formData.spouseName,
        spouse_phone: formData.spousePhone,
        spouse_polo_size: formData.spousePoloSize,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
        profile: formData.dateOfBirth ? { birthday: formData.dateOfBirth } : undefined,
      });

      const activated = await activateProspectWithAgencyCode(addAgencyCodeFor.id, formData.agencyCode.trim());
      const updated: Prospect = {
        ...updatedDetails,
        ...activated,
        profile: activated.profile ?? updatedDetails.profile,
      };
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
      setAddAgencyCodeFor(null);
      addToast({ type: 'success', message: 'Agency code added successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to add agency code.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleQuickActionLog = async (row: Prospect, actionLabel: string) => {
    try {
      setSavingCallLog(true);
      const updated = await saveProspectCallLog(row, 'Connected', actionLabel);
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save action.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleAddProductionSave = async (data: AddProductionFormData) => {
    if (!addProductionFor) return;

    try {
      setSavingProduction(true);
      const [pA, pB] = data.split.split('/').map((v) => parseFloat(v) || 0);
      const base = parseFloat(data.targetPoints) || 0;
      const isOther = data.company === 'OTHER' || data.product === 'OTHER';
      const companyProductId = isOther
        ? null
        : productionCompanyProductIds[`${data.company}|${data.product}`] ?? null;
      const pointsTarget = isOther
        ? (() => {
            const pct = parseFloat(data.multiplierPercent);
            const multiplier = Number.isNaN(pct) ? 1 : pct;
            return Math.round(base * multiplier * 100) / 100;
          })()
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
        agent_2_pct: pB,
        split_mode: data.agentMode === 'split' ? 'split' : 'solo',
      });

      setAddProductionFor(null);
      addToast({ type: 'success', message: 'Added to Production Tracker.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save production record.',
      });
    } finally {
      setSavingProduction(false);
    }
  };

  const confirmDeleteProspect = async () => {
    if (!pendingDeleteProspect) return;
    const previousRows = rows;
    setRows((prev) => prev.filter((prospect) => String(prospect.id) !== String(pendingDeleteProspect.id)));

    try {
      setSavingCallLog(true);
      await deleteProspect(pendingDeleteProspect.id);
      setPendingDeleteProspect(null);
      addToast({ type: 'success', message: 'Prospect deleted successfully.' });
    } catch (err) {
      setRows(previousRows);
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete prospect.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const notesForOpenProspect = useMemo(() => {
    if (!notesOpenFor) return [];
    const notes = notesByProspectId[notesOpenFor.id] || [];
    return [...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [notesByProspectId, notesOpenFor]);

  const getProspectRowClassName = useCallback((row: Prospect): string => {
    const mark = normalizeMarkValue(row.prospect_meta?.mark);
    if (mark === 'default') return '';
    return `prospect-row-mark-${mark}`;
  }, []);

  const columns = useMemo(
    () =>
      buildProspectColumns(
        setEditingProspect,
        setActiveCallLogProspect,
        setPendingDeleteProspect,
        {
          notesByProspectId,
          noteDraftByProspectId,
          focusedNoteInputId,
          savingNoteProspectIdSet,
          savingMetaProspectIdSet,
          onNoteDraftChange: handleNoteDraftChange,
          onNoteFocus: setFocusedNoteInputId,
          onNoteBlur: () => setFocusedNoteInputId(null),
          onAddInlineNote: handleAddInlineNote,
          onOpenAllNotes: (row) => {
            void ensureNotesLoaded(row.id);
            setNotesOpenFor(row);
            setModalNoteDraft('');
          },
          onToggleProspectMeta: handleToggleProspectMeta,
          onChangeProspectMark: handleChangeProspectMark,
          onChangeProspectOutcome: handleChangeProspectOutcome,
          onOpenLeaderProfile: (row) => {
            void handleOpenRelatedProfile(row, 'leader');
          },
          onOpenProspectProfile: (row) => setProfileOpenFor({ userId: row.id, userName: row.full_name }),
          onOpenRecruiterProfile: (row) => {
            void handleOpenRelatedProfile(row, 'recruiter');
          },
          editingProfileProspectId,
          profileDraftByProspectId,
          onStartProfileEdit: handleStartProfileEdit,
          onProfileDraftFieldChange: handleProfileDraftFieldChange,
          onProfileDraftFlagChange: handleProfileDraftFlagChange,
          onSaveProfileEdit: handleSaveProfileEdit,
          onCancelProfileEdit: () => setEditingProfileProspectId(null),
          getRowIndex: (row) => rows.indexOf(row) + 1,
        }
      ),
    [
      editingProfileProspectId,
      ensureNotesLoaded,
      focusedNoteInputId,
      handleAddInlineNote,
      handleChangeProspectMark,
      handleChangeProspectOutcome,
      handleNoteDraftChange,
      handleOpenRelatedProfile,
      handleProfileDraftFieldChange,
      handleProfileDraftFlagChange,
      handleSaveProfileEdit,
      handleStartProfileEdit,
      handleToggleProspectMeta,
      noteDraftByProspectId,
      notesByProspectId,
      profileDraftByProspectId,
      rows,
      savingMetaProspectIdSet,
      savingNoteProspectIdSet,
    ]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title.replace('{ownerName}', ownerName)}
      contentClassName="h-[94vh] w-[96vw] max-w-none flex flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white/70">
          {introText.replace('{ownerName}', ownerName)}
        </div>

        <div className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {loading ? (
            <div className="px-4 py-6 text-sm text-white/70">{loadingText}</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-white/70">{emptyText}</div>
          ) : (
            <TrackerTable
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.id)}
              stickyFirstNColumns={3}
              resizable
              tableId="associate-prospect-list"
              emptyMessage={emptyText}
              className="h-full"
              rowClassName={(row) => getProspectRowClassName(row)}
            />
          )}
        </div>

        <div className="flex items-center justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>

        <CallLogModal
          prospect={activeCallLogProspect}
          saving={savingCallLog}
          onClose={() => setActiveCallLogProspect(null)}
          onSave={handleSaveCallLog}
          onInvite={handleInviteProspect}
          onAddAgencyCode={handleAddAgencyCode}
          onRequestTrainer={(prospect) => handleQuickActionLog(prospect, 'Requested trainer')}
          onAddAppointment={(prospect) => handleQuickActionLog(prospect, 'Added appointment')}
          onAddProduction={async (prospect) => {
            setAddProductionFor(prospect);
          }}
        />

        <AddAgencyCodeModal
          prospect={addAgencyCodeFor}
          saving={savingCallLog}
          onClose={() => setAddAgencyCodeFor(null)}
          onSubmit={handleSubmitAddAgencyCode}
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
          onSubmit={handleAddProductionSave}
        />

        <AddProspectModal
          open={Boolean(editingProspect)}
          title="Edit Prospect"
          submitLabel="Update Prospect"
          initialForm={editingProspect ? mapProspectToForm(editingProspect) : null}
          saving={savingCallLog}
          onClose={() => setEditingProspect(null)}
          onSubmit={handleUpdateProspect}
        />

        <ConfirmationDialog
          open={Boolean(pendingDeleteProspect)}
          title="Delete Prospect"
          message={`Remove ${pendingDeleteProspect?.full_name || pendingDeleteProspect?.email || ''} from this list?`}
          confirmText="Delete"
          cancelText="Cancel"
          loading={savingCallLog}
          onClose={() => setPendingDeleteProspect(null)}
          onConfirm={confirmDeleteProspect}
        />

        <TrackerNotesModal
          open={Boolean(notesOpenFor)}
          title={`Notes - ${notesOpenFor?.full_name || notesOpenFor?.email || ''}`}
          notes={notesForOpenProspect}
          draft={modalNoteDraft}
          saving={Boolean(
            notesOpenFor &&
              (savingNoteProspectIdSet.has(notesOpenFor.id) || loadingNoteProspectIdSet.has(notesOpenFor.id))
          )}
          onClose={() => setNotesOpenFor(null)}
          onDraftChange={setModalNoteDraft}
          onAddNote={handleAddModalNote}
        />

        <TrackerUserProfileModal
          open={Boolean(profileOpenFor)}
          userId={profileOpenFor?.userId ?? null}
          fallbackName={profileOpenFor?.userName}
          fallbackAvatarUrl={profileOpenFor?.avatarUrl}
          onClose={() => setProfileOpenFor(null)}
          onSaved={(updated: TrackerUserProfile) => {
            setProfileOpenFor((prev) => {
              if (!prev || prev.userId !== updated.id) return prev;
              return {
                ...prev,
                userName:
                  updated.full_name?.trim() ||
                  `${updated.first_name || ''} ${updated.last_name || ''}`.trim() ||
                  prev.userName,
                avatarUrl: updated.avatar_url ?? prev.avatarUrl,
              };
            });
          }}
        />
      </div>
    </Modal>
  );
}
