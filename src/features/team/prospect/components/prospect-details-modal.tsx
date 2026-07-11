import { useEffect, useState } from 'react';
import { Briefcase, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { Modal } from '@/shared/components';
import { fetchProspectDetails, type Prospect } from '../services/prospect-service';

interface ProspectDetailsModalProps {
  open: boolean;
  prospectId: number | null;
  fallbackName?: string;
  onClose: () => void;
}

const PROFILE_FLAG_LABELS: Record<string, string> = {
  age25Plus: '25+ Y.O', homeowner: 'Homeowner', solidCareer: 'Solid Career Background',
  income75kPlus: '$75k+ Income', dissatisfied: 'Dissatisfied', entrepreneurial: 'Entrepreneurial',
  spanishPreferred: 'Spanish Speaking Preferred', married: 'Married', dependentKids: 'Dependent Kids',
};

export function ProspectDetailsModal({ open, prospectId, fallbackName, onClose }: ProspectDetailsModalProps) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !prospectId) return;
    setLoading(true);
    setError('');
    void fetchProspectDetails(prospectId)
      .then(setProspect)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load prospect.'))
      .finally(() => setLoading(false));
  }, [open, prospectId]);

  const profile = prospect?.profile;
  const flags = profile?.flags || {};
  const activeFlags = Object.entries(flags).filter(([key, flag]) => key !== 'language' && flag === true);
  const address = [profile?.home_address, profile?.home_address2, profile?.home_city, profile?.state, profile?.home_zip].filter(Boolean).join(', ');

  return (
    <Modal open={open} title="Prospect Details" onClose={onClose} contentClassName="max-w-[720px]">
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading prospect...</p> : error ? <p className="py-8 text-center text-sm text-red-500">{error}</p> : (
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-900 p-5 text-white">
            <div className="flex items-center gap-3"><UserRound size={25} /><div><h2 className="text-xl font-bold">{prospect?.full_name || fallbackName || 'Prospect'}</h2><p className="text-xs text-slate-400">Prospect profile · View only</p></div></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Detail icon={<Mail size={16} />} label="Email" value={prospect?.email} />
            <Detail icon={<Phone size={16} />} label="Phone" value={prospect?.phone || profile?.phone} />
            <Detail icon={<MapPin size={16} />} label="Address" value={address} />
            <Detail icon={<Briefcase size={16} />} label="Occupation" value={profile?.occupation} />
            <Detail label="How known" value={profile?.how_known} />
            <Detail label="Relationship" value={profile?.relationship != null ? `${profile.relationship}/10` : ''} />
            <Detail label="Recruiter" value={prospect?.recruited_by_name} />
            <Detail label="Leader" value={prospect?.leader_name} />
            <Detail label="Language" value={typeof flags.language === 'string' ? flags.language : ''} />
            <Detail label="What was told" value={profile?.what_told} />
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
            <h3 className="mb-3 text-sm font-bold">Profile</h3>
            <div className="flex flex-wrap gap-2">{activeFlags.length ? activeFlags.map(([key]) => <span key={key} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-600 dark:text-amber-300">{PROFILE_FLAG_LABELS[key] || key}</span>) : <span className="text-sm text-slate-500">No profile flags selected.</span>}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Detail({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  return <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{icon}{label}</div><div className="mt-1 break-words text-sm font-medium">{value || '—'}</div></div>;
}
