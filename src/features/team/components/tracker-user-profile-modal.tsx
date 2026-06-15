import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  Modal,
  Select,
  UserAutocompleteDropdown,
} from '@/shared/components';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToastStore } from '@/store';
import { fetchLevels, type Level } from '@/features/team/prospect/services/prospect-service';
import {
  fetchTrackerProfileSnapshots,
  fetchTrackerUserProfile,
  terminateTrackerUser,
  type TrackerProfileSnapshots,
  type TrackerUserProfile,
  updateTrackerUserProfile,
  uploadTrackerUserPhoto,
} from '@/features/team/services/tracker-user-profile-service';

interface TrackerUserProfileModalProps {
  open: boolean;
  userId: number | null;
  fallbackName?: string;
  fallbackAvatarUrl?: string | null;
  onClose: () => void;
  onSaved?: (user: TrackerUserProfile) => void;
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amaDate: string;
  agencyCode: string;
  poloSize: string;
  spouseName: string;
  spousePhone: string;
  spousePoloSize: string;
  levelId: number | null;
  levelLabel: string;
  recruiterId: number | null;
  recruiterLabel: string;
  leaderId: number | null;
  leaderLabel: string;
  birthday: string;
  state: string;
  homeAddress: string;
  homeAddress2: string;
  homeCity: string;
  homeZip: string;
  gender: string;
  occupation: string;
  howKnown: string;
  whatTold: string;
  relationship: string;
  dependentChildren: boolean;
  married: boolean;
}

const EMPTY_FORM: ProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  amaDate: '',
  agencyCode: '',
  poloSize: '',
  spouseName: '',
  spousePhone: '',
  spousePoloSize: '',
  levelId: null,
  levelLabel: '',
  recruiterId: null,
  recruiterLabel: '',
  leaderId: null,
  leaderLabel: '',
  birthday: '',
  state: '',
  homeAddress: '',
  homeAddress2: '',
  homeCity: '',
  homeZip: '',
  gender: '',
  occupation: '',
  howKnown: '',
  whatTold: '',
  relationship: '',
  dependentChildren: false,
  married: false,
};

const US_STATES = [
  'AB', 'AK', 'AL', 'AR', 'AZ', 'BC', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL',
  'IN', 'KS', 'KY', 'LA', 'MA', 'MB', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NB', 'NC', 'ND',
  'NE', 'NH', 'NJ', 'NL', 'NM', 'NS', 'NT', 'NU', 'NV', 'NY', 'OH', 'OK', 'ON', 'OR', 'PA', 'PE',
  'QC', 'RI', 'SC', 'SD', 'SK', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY', 'YT',
];

function toDisplayName(user: TrackerUserProfile | null, fallbackName?: string): string {
  if (!user) return fallbackName || 'User Profile';
  const full = user.full_name?.trim();
  if (full) return full;
  const combined = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return combined || fallbackName || 'User Profile';
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function mapToForm(user: TrackerUserProfile): ProfileFormState {
  return {
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    amaDate: user.ama_date || '',
    agencyCode: user.agency_code || '',
    poloSize: user.polo_size || '',
    spouseName: user.spouse_name || '',
    spousePhone: user.spouse_phone || '',
    spousePoloSize: user.spouse_polo_size || '',
    levelId: typeof user.level === 'object' ? (user.level?.id ?? null) : null,
    levelLabel:
      typeof user.level === 'string'
        ? user.level
        : user.level?.name || user.level?.code || '',
    recruiterId: user.recruited_by ?? null,
    recruiterLabel: user.recruited_by_name || '',
    leaderId: user.leader ?? null,
    leaderLabel: user.leader_name || '',
    birthday: user.profile?.birthday || '',
    state: user.profile?.state || '',
    homeAddress: user.profile?.home_address || '',
    homeAddress2: user.profile?.home_address2 || '',
    homeCity: user.profile?.home_city || '',
    homeZip: user.profile?.home_zip || '',
    gender: user.profile?.gender || '',
    occupation: user.profile?.occupation || '',
    howKnown: user.profile?.how_known || '',
    whatTold: user.profile?.what_told || '',
    relationship:
      user.profile?.relationship === null || user.profile?.relationship === undefined
        ? ''
        : String(user.profile.relationship),
    dependentChildren: Boolean(user.profile?.dependent_children),
    married: Boolean(user.profile?.flags?.married),
  };
}

function ageFromBirthday(value: string): string {
  if (!value) return '—';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '—';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} yrs` : '—';
}

function yesNo(value: boolean | null | undefined): string {
  return value ? 'Yes' : 'No';
}

interface LabeledFieldProps {
  label: string;
  className?: string;
  required?: boolean;
  children: React.ReactNode;
}

function LabeledField({ label, className = '', required = false, children }: LabeledFieldProps) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs text-slate-600 dark:text-white/70">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </div>
      {children}
    </div>
  );
}

export function TrackerUserProfileModal({
  open,
  userId,
  fallbackName,
  onClose,
  onSaved,
}: TrackerUserProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<TrackerUserProfile | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshots, setSnapshots] = useState<TrackerProfileSnapshots | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [confirmTerminateOpen, setConfirmTerminateOpen] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!open || userId == null) return;

    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([fetchTrackerUserProfile(userId), fetchTrackerProfileSnapshots(userId), fetchLevels()])
      .then(([loadedProfile, loadedSnapshots, loadedLevels]) => {
        if (!active) return;
        setProfile(loadedProfile);
        setSnapshots(loadedSnapshots);
        setLevels(loadedLevels);
        setForm(mapToForm(loadedProfile));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load profile data.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, userId]);

  const displayName = useMemo(() => toDisplayName(profile, fallbackName), [profile, fallbackName]);
  const avatarUrl = profile?.profile?.photo_url_thumb || null;
  const avatarSrc = avatarUrl;//avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${avatarVersion}` : null;
  const registrationStatus = useMemo(() => {
    const rawStatus = (profile?.registration_status || profile?.status || '').toString().trim().toLowerCase();
    if (!rawStatus) return 'Registered';
    return rawStatus === 'unregistered' ? 'Unregistered' : 'Registered';
  }, [profile?.registration_status, profile?.status]);


  const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !userId) return;
    try {
      setUploadingPhoto(true);
      const updated = await uploadTrackerUserPhoto(userId, file);
      setProfile((prev) => ({ ...prev, ...updated }));
      addToast({ type: 'success', message: 'Profile photo uploaded successfully.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload profile photo.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!open) return null;

  const updateField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (userId == null) return;

    if (!form.firstName.trim() || !form.lastName.trim()) {
      addToast({ type: 'warning', message: 'First name and last name are required.' });
      return;
    }

    try {
      setSaving(true);
      const relationshipNumber = Number.parseInt(form.relationship, 10);

      await updateTrackerUserProfile(userId, {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        agency_code: form.agencyCode.trim(),
        ama_date: form.amaDate || null,
        polo_size: form.poloSize.trim(),
        spouse_name: form.spouseName.trim(),
        spouse_phone: form.spousePhone.trim(),
        spouse_polo_size: form.spousePoloSize.trim(),
        level_id: form.levelId,
        recruited_by: form.recruiterId,
        leader: form.leaderId,
        profile: {
          birthday: form.birthday || '',
          state: form.state || '',
          home_address: form.homeAddress || '',
          home_address2: form.homeAddress2 || '',
          home_city: form.homeCity || '',
          home_zip: form.homeZip || '',
          gender: form.gender || '',
          occupation: form.occupation || '',
          how_known: form.howKnown || '',
          what_told: form.whatTold || '',
          relationship: Number.isFinite(relationshipNumber) ? relationshipNumber : null,
          dependent_children: form.dependentChildren,
          flags: {
            ...(profile?.profile?.flags || {}),
            married: form.married,
            dependentKids: form.dependentChildren,
          },
        },
      });

      const updated = await fetchTrackerUserProfile(userId);

      const normalizedUpdated: TrackerUserProfile = {
        ...updated,
        level:
          updated.level
          || (form.levelId
            ? {
                id: form.levelId,
                name: form.levelLabel || null,
              }
            : null),
        recruited_by: updated.recruited_by ?? form.recruiterId,
        leader: updated.leader ?? form.leaderId,
        recruited_by_name: updated.recruited_by_name || form.recruiterLabel || null,
        leader_name: updated.leader_name || form.leaderLabel || null,
      };

      setProfile(normalizedUpdated);
      setForm(mapToForm(normalizedUpdated));
      onSaved?.(normalizedUpdated);
      addToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateUser = async () => {
    if (userId == null || terminating) return;
    try {
      setTerminating(true);
      await terminateTrackerUser(userId);
      addToast({ type: 'success', message: 'User terminated successfully.' });
      onSaved?.(profile as TrackerUserProfile);
      onClose();
      window.location.reload();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to terminate user.',
      });
    } finally {
      setTerminating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`User Details - ${displayName}`}
      contentClassName="max-w-[1100px] max-h-[92vh] flex flex-col"
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-600 dark:text-white/80">Loading user details...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-200 dark:border-white/20 dark:bg-white/10">
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-800 dark:text-white/90">
                  {initialsFromName(displayName)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold text-slate-900 dark:text-white">{displayName}</div>
              <div className="text-xs text-slate-600 dark:text-white/70">
                {profile?.agency_code || 'Unknown agency'} • {profile?.roles?.[0] || 'No plan'}
              </div>
            </div>
            <div className="flex flex-col items-end ml-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleUploadPhoto}
              />
              <Button
                type="button"
                className="btn-upload-photo min-w-[120px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto || loading}
              >
                {uploadingPhoto ? (
                  <span>
                    <span className="inline-block animate-spin mr-2 align-middle">⏳</span>
                    Uploading...
                  </span>
                ) : (
                  <span>
                    <span className="inline-block align-middle">📤</span> Upload Photo
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Editable Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                <LabeledField label="First Name">
                  <Input variant="surface" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="First name" />
                </LabeledField>
                <LabeledField label="Last Name">
                  <Input variant="surface" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Last name" />
                </LabeledField>
                <LabeledField label="Email">
                  <Input type="email" variant="surface" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Email" />
                </LabeledField>
                <LabeledField label="Phone">
                  <Input variant="surface" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Phone" />
                </LabeledField>
                <LabeledField label="AMA Date">
                  <DatePicker value={form.amaDate} onChange={(value) => updateField('amaDate', value)} className="h-10" />
                </LabeledField>
                <LabeledField label="Agency Code">
                  <Input variant="surface" value={form.agencyCode} onChange={(e) => updateField('agencyCode', e.target.value)} placeholder="Agency code" />
                </LabeledField>
                <LabeledField label="Polo Size">
                  <Input variant="surface" value={form.poloSize} onChange={(e) => updateField('poloSize', e.target.value)} placeholder="Polo size" />
                </LabeledField>
                <LabeledField label="Spouse Polo Size">
                  <Input variant="surface" value={form.spousePoloSize} onChange={(e) => updateField('spousePoloSize', e.target.value)} placeholder="Spouse polo size" />
                </LabeledField>
                <LabeledField label="Spouse Name">
                  <Input variant="surface" value={form.spouseName} onChange={(e) => updateField('spouseName', e.target.value)} placeholder="Spouse name" />
                </LabeledField>
                <LabeledField label="Spouse Phone">
                  <Input variant="surface" value={form.spousePhone} onChange={(e) => updateField('spousePhone', e.target.value)} placeholder="Spouse phone" />
                </LabeledField>
                <LabeledField label="Level">
                  <Select
                    value={form.levelId == null ? '' : String(form.levelId)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        updateField('levelId', null);
                        updateField('levelLabel', '');
                        return;
                      }

                      const parsed = Number.parseInt(raw, 10);
                      if (!Number.isFinite(parsed)) {
                        updateField('levelId', null);
                        updateField('levelLabel', '');
                        return;
                      }

                      const selectedLevel = levels.find((level) => level.id === parsed);
                      updateField('levelId', parsed);
                      updateField('levelLabel', selectedLevel?.name || selectedLevel?.code || '');
                    }}
                  >
                    <option value="" className="text-black">Select level</option>
                    {levels.map((level) => (
                      <option key={level.id} value={String(level.id)} className="text-black">
                        {level.name || level.code}
                      </option>
                    ))}
                  </Select>
                </LabeledField>
                <LabeledField label="Registration Status">
                  <Select value={registrationStatus} disabled>
                    <option value="Registered" className="text-black">Registered</option>
                    <option value="Unregistered" className="text-black">Unregistered</option>
                  </Select>
                </LabeledField>
                <LabeledField label="Recruiter">
                  <UserAutocompleteDropdown
                    selectedId={form.recruiterId}
                    selectedLabel={form.recruiterLabel}
                    placeholder="Select recruiter"
                    fetchFromApi
                    onSelect={(option) => {
                      updateField('recruiterId', option.id);
                      updateField('recruiterLabel', option.label);
                    }}
                  />
                </LabeledField>
                <LabeledField label="Leader">
                  <UserAutocompleteDropdown
                    selectedId={form.leaderId}
                    selectedLabel={form.leaderLabel}
                    placeholder="Select leader"
                    fetchFromApi
                    onSelect={(option) => {
                      updateField('leaderId', option.id);
                      updateField('leaderLabel', option.label);
                    }}
                  />
                </LabeledField>
                <LabeledField label="Birthday" required>
                  <DatePicker
                    value={form.birthday}
                    onChange={(value) => updateField('birthday', value)}
                    className="h-10"
                    monthDayOnly
                  />
                </LabeledField>
                <LabeledField label="State">
                  <Select value={form.state} onChange={(e) => updateField('state', e.target.value)}>
                    <option value="" className="text-black">State</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state} className="text-black">{state}</option>
                    ))}
                  </Select>
                </LabeledField>
                <LabeledField label="Address">
                  <Input variant="surface" value={form.homeAddress} onChange={(e) => updateField('homeAddress', e.target.value)} placeholder="Street address" />
                </LabeledField>
                <LabeledField label="Address 2">
                  <Input variant="surface" value={form.homeAddress2} onChange={(e) => updateField('homeAddress2', e.target.value)} placeholder="Apartment, suite, unit" />
                </LabeledField>
                <LabeledField label="City">
                  <Input variant="surface" value={form.homeCity} onChange={(e) => updateField('homeCity', e.target.value)} placeholder="City" />
                </LabeledField>
                <LabeledField label="Zip">
                  <Input variant="surface" value={form.homeZip} onChange={(e) => updateField('homeZip', e.target.value)} placeholder="Zip code" />
                </LabeledField>
                <LabeledField label="Gender">
                  <Select value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                    <option value="" className="text-black">Gender</option>
                    <option value="Male" className="text-black">Male</option>
                    <option value="Female" className="text-black">Female</option>
                  </Select>
                </LabeledField>
                <LabeledField label="Relationship (1-10)">
                  <Input variant="surface" value={form.relationship} onChange={(e) => updateField('relationship', e.target.value)} placeholder="Relationship (1-10)" />
                </LabeledField>
                <LabeledField label="Occupation">
                  <Input variant="surface" value={form.occupation} onChange={(e) => updateField('occupation', e.target.value)} placeholder="Occupation" />
                </LabeledField>
                <LabeledField label="How Known">
                  <Input variant="surface" value={form.howKnown} onChange={(e) => updateField('howKnown', e.target.value)} placeholder="How known" />
                </LabeledField>
                <LabeledField label="What Told">
                  <Input variant="surface" value={form.whatTold} onChange={(e) => updateField('whatTold', e.target.value)} placeholder="What told" />
                </LabeledField>
              </div>

              <div className="flex items-center gap-4 pt-1 text-sm text-slate-800 dark:text-white/90">
                <label className="inline-flex items-center gap-2">
                  <Checkbox checked={form.married} onChange={(e) => updateField('married', e.target.checked)} />
                  Married
                </label>
                <label className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={form.dependentChildren}
                    onChange={(e) => updateField('dependentChildren', e.target.checked)}
                  />
                  Dependent kids
                </label>
                <span className="text-xs text-slate-600 dark:text-white/60">Age: {ageFromBirthday(form.birthday)}</span>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-white/90">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Tracker Summary</h4>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold uppercase text-slate-600 dark:text-white/70">Mission</div>
                {snapshots?.missionTracker ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>1st Recruit: {yesNo(snapshots.missionTracker.finish_1st_recruit)}</div>
                    <div>Big Event: {yesNo(snapshots.missionTracker.big_event_1st)}</div>
                    <div>1st Savings: {yesNo(snapshots.missionTracker.finish_1st_savings)}</div>
                    <div>Savings Amt: {snapshots.missionTracker.savings_1st_amount ?? '-'}</div>
                    <div>Pass Exam: {snapshots.missionTracker.pass_exam_date || '-'}</div>
                    <div>Sircon/NIPR: {snapshots.missionTracker.sircon_nipr_date || '-'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-white/60">No mission record.</div>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold uppercase text-slate-600 dark:text-white/70">Associate</div>
                {snapshots?.associate ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Key Player: {yesNo(snapshots.associate.is_key_player)}</div>
                    <div>Training: {yesNo(snapshots.associate.is_training)}</div>
                    <div>Big Event 2nd: {yesNo(snapshots.associate.big_event_2nd)}</div>
                    <div>Net Licensed: {snapshots.associate.net_license_amount}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-white/60">No associate record.</div>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold uppercase text-slate-600 dark:text-white/70">Licensing</div>
                {snapshots?.licensing ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Licensed: {yesNo(snapshots.licensing.is_licensed)}</div>
                    <div>Xcel: {yesNo(snapshots.licensing.is_xcel)}</div>
                    <div>Test Date: {snapshots.licensing.test_date || '-'}</div>
                    <div>Test Result: {snapshots.licensing.test_result ? 'Pass' : 'Fail'}</div>
                    <div>Agent Approval: {snapshots.licensing.agent_approval_date || '-'}</div>
                    <div>Sircon/NIPR: {snapshots.licensing.sircon_nipr_date || '-'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-white/60">No licensing record.</div>
                )}
              </div>

              <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                <div>Recruiter: {profile?.recruited_by_name || '-'}</div>
                <div>Leader: {profile?.leader_name || '-'}</div>
                <div>
                  Level: {typeof profile?.level === 'string' ? profile.level : profile?.level?.name || '-'}
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
            <Button
              type="button"
              variant="destructive"
              className="min-w-[130px]"
              onClick={() => setConfirmTerminateOpen(true)}
              disabled={terminating || loading || profile?.is_active === false}
            >
              {terminating ? 'Terminating...' : 'Terminate User'}
            </Button>
            <ConfirmDialog
              open={confirmTerminateOpen}
              title="Confirm Termination"
              message={`Terminate ${displayName}?`}
              confirmLabel="Terminate"
              cancelLabel="Cancel"
              confirmVariant="destructive"
              onConfirm={() => {
                setConfirmTerminateOpen(false);
                void handleTerminateUser();
              }}
              onCancel={() => setConfirmTerminateOpen(false)}
            />
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
