import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, MailPlus, UserMinus, UserPlus, Users, X } from 'lucide-react';

type InviteRole = 'company-owner' | 'builder';
type ModalName = 'self' | 'partner' | 'remove' | null;

interface PendingInvitation {
  id: string;
  name: string;
  agencyCode: string;
  role: InviteRole;
  status: 'pending';
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[#202630]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="builder-invite-modal-title">
        <div className="flex items-start justify-between gap-4"><h2 id="builder-invite-modal-title" className="text-lg font-bold text-[#25211f] dark:text-white">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Close"><X size={18} /></button></div>
        {children}
      </section>
    </div>
  );
}

export default function BuilderInvitationsPage() {
  const [modal, setModal] = useState<ModalName>(null);
  const [role, setRole] = useState<InviteRole>('company-owner');
  const [fullName, setFullName] = useState('');
  const [agencyCode, setAgencyCode] = useState('');
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const totalSeats = 10;
  const seatsLeft = Math.max(totalSeats - pending.length, 0);

  const closeModal = () => setModal(null);
  const submitInvitation = (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !agencyCode.trim() || seatsLeft === 0) return;
    setPending((items) => [...items, { id: crypto.randomUUID(), name: fullName.trim(), agencyCode: agencyCode.trim().toUpperCase(), role, status: 'pending' }]);
    setFullName('');
    setAgencyCode('');
    closeModal();
  };

  return (
    <div className="space-y-5 p-0 text-[#25211f] dark:text-white">
      <section className="rounded-[24px] border border-[#e8e1da] bg-gradient-to-br from-white via-[#faf8f5] to-[#fff6eb] p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:from-[#1b1f29] dark:to-[#2a241e]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white shadow-[0_6px_18px_rgba(233,67,19,0.2)]"><MailPlus size={23} /></div><div><h1 className="text-2xl font-bold tracking-[-0.03em]">Invitations</h1><p className="mt-1 text-xs text-[#817a74] dark:text-slate-400">Invite owners and builders, and track who hasn’t accepted yet.</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#f4c4b4] bg-[#fff7f2] px-3 py-2 text-xs font-semibold text-[#e94313] dark:border-[#f0522b]/25 dark:bg-[#39231f]">{seatsLeft} of {totalSeats} builder seats left</span>
            <button type="button" onClick={() => setModal('self')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ddd6] bg-white px-4 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5"><UserPlus size={15} /> Add Yourself As A Builder</button>
            <button type="button" onClick={() => setModal('partner')} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8a1f] to-[#e94313] px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(233,67,19,0.24)] transition hover:-translate-y-0.5"><Users size={15} /> Invite Business Partner</button>
            <button type="button" onClick={() => setModal('remove')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ddd6] bg-white px-4 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5"><UserMinus size={15} /> Remove User</button>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#e8e0d8] bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_10px_28px_rgba(28,25,23,0.055)] dark:border-white/10 dark:bg-[#1b1f29]">
        <h2 className="flex items-center gap-2 font-bold"><AlertCircle size={18} className="text-[#e94313]" /> Invitation Rules</h2>
        <ol className="mt-4 space-y-3 text-sm text-[#6f6862] dark:text-slate-300">
          {['Only invite your direct Company Owners. They will invite their own Company Owners.', 'Only invite your Baseshop Builders. Other Builders in your team will be invited by their Uplines.', 'If someone has accidentally invited one of your Company Owners or Baseshop Builders, please contact support.'].map((rule, index) => <li key={rule} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff0e7] text-xs font-bold text-[#e94313] dark:bg-[#e94313]/15">{index + 1}</span><span className="pt-0.5">{rule}</span></li>)}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 font-bold">Pending Invitations</h2>
        {pending.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-[#e8e0d8] bg-white p-8 text-center shadow-[0_1px_3px_rgba(28,25,23,0.04),0_10px_28px_rgba(28,25,23,0.055)] dark:border-white/10 dark:bg-[#1b1f29]"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white"><MailPlus size={21} /></div><h3 className="font-semibold">No pending invitations</h3><p className="mt-1 text-sm text-slate-400">Invites you send appear here until they’re accepted.</p></div> : <div className="grid gap-3 lg:grid-cols-2">{pending.map((invite) => <article key={invite.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#e8e0d8] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#222833]"><div><h3 className="font-semibold">{invite.name}</h3><p className="mt-1 text-xs text-slate-400">{invite.agencyCode} · {invite.role === 'company-owner' ? 'Company Owner' : 'Builder'}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Pending</span></article>)}</div>}
      </section>

      {modal === 'self' ? <ModalShell title="Add Yourself As A Builder?" onClose={closeModal}><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">This uses one of your {totalSeats} builder seats. Your reported business will count toward your Baseshop and Company Builder goals, and you will appear on the Bulletin.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10">Cancel</button><button type="button" onClick={closeModal} className="rounded-lg bg-gradient-to-r from-[#ff8a1f] to-[#e94313] px-4 py-2 text-sm font-semibold text-white">Use One Seat</button></div></ModalShell> : null}

      {modal === 'partner' ? <ModalShell title="Invite a business partner" onClose={closeModal}><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Enter their full name and agent code. They must have a New Art of Living AI account.</p><form onSubmit={submitInvitation} className="mt-5 space-y-4"><fieldset><legend className="mb-2 text-sm font-semibold">Invite as</legend><div className="flex gap-2">{([['company-owner', 'Company Owner'], ['builder', 'Builder']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${role === value ? 'border-[#ef5b22] bg-[#fff1e9] text-[#e94313] dark:bg-[#e94313]/15' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>{label}</button>)}</div><p className="mt-2 text-xs text-slate-400">{role === 'company-owner' ? 'Can invite and manage their own Company Owners and Builders.' : `Uses one builder seat. ${seatsLeft} of ${totalSeats} seats left.`}</p></fieldset><label className="block text-sm font-semibold">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="James Carter" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-[#ef5b22] focus:ring-4 focus:ring-[#ef5b22]/10 dark:border-white/10 dark:bg-white/5" /></label><label className="block text-sm font-semibold">Agent code<input value={agencyCode} onChange={(event) => setAgencyCode(event.target.value)} placeholder="ABC123" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal uppercase outline-none focus:border-[#ef5b22] focus:ring-4 focus:ring-[#ef5b22]/10 dark:border-white/10 dark:bg-white/5" /></label><button type="submit" disabled={!fullName.trim() || !agencyCode.trim() || seatsLeft === 0} className="rounded-lg bg-gradient-to-r from-[#ff8a1f] to-[#e94313] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Send invitation</button></form></ModalShell> : null}

      {modal === 'remove' ? <ModalShell title="Remove a user" onClose={closeModal}><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">User removal will be available when the invitations API is connected.</p><div className="mt-6 flex justify-end"><button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10">Close</button></div></ModalShell> : null}
    </div>
  );
}
