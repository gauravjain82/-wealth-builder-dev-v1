import { useEffect, useRef, useState } from 'react';
import {
  Block,
  Button,
  ConfirmationDialog,
  Input,
  Modal,
} from '@/shared/components';
import { useToastStore } from '@/store';
import {
  deleteInvitation,
  fetchInvitations,
  resendInvitation,
  sendInvitation,
  type Invitation,
} from '../services/invite-agents-service';

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusBadge({ status }: { status: Invitation['status'] }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-white/50">
      Cancelled
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-white/10">
      <span className="text-xs text-slate-500 dark:text-white/50">
        Showing {from} to {to} of {total} agent{total !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          Prev
        </button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400 dark:text-white/40">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`min-w-[32px] rounded border px-2 py-1.5 text-xs ${
                p === page
                  ? 'border-amber-400 bg-amber-100 font-semibold text-amber-700 dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function RowMenu({
  invitation,
  onResend,
  onViewDetail,
  onDelete,
}: {
  invitation: Invitation;
  onResend: (inv: Invitation) => void;
  onViewDetail: (inv: Invitation) => void;
  onDelete: (inv: Invitation) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
        onClick={() => setOpen((v) => !v)}
        aria-label="Row actions"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-white/15 dark:bg-[#1e2431]">
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/8 dark:hover:text-white"
            onClick={() => { setOpen(false); onResend(invitation); }}
          >
            ✉️ Resend Email
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/8 dark:hover:text-white"
            onClick={() => { setOpen(false); onViewDetail(invitation); }}
          >
            👁 View Detail
          </button>
          <div className="my-1 border-t border-slate-200 dark:border-white/10" />
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
            onClick={() => { setOpen(false); onDelete(invitation); }}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DetailModal({ invitation, onClose }: { invitation: Invitation | null; onClose: () => void }) {
  if (!invitation) return null;
  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: invitation.to_name || '—' },
    { label: 'Email', value: invitation.email },
    { label: 'Status', value: invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1) },
    { label: 'Invited By', value: invitation.invited_by_name || '—' },
    { label: 'Sent On', value: formatDate(invitation.created_at) },
    { label: 'Expires', value: formatDate(invitation.expires_at) },
    { label: 'Public URL', value: invitation.public_url || '—' },
  ];
  return (
    <Modal open title="Invitation Detail" onClose={onClose} contentClassName="max-w-[480px]">
      <dl className="space-y-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <dt className="w-28 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">{label}</dt>
            <dd className="break-all text-sm text-slate-800 dark:text-white/90">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

function InviteModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (email: string, name: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) { setEmail(''); setName(''); }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    void onSubmit(email.trim(), name.trim());
  };

  return (
    <Modal open={open} title="Invite Agent" onClose={onClose} contentClassName="max-w-[460px]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">Name (optional)</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name of the person"
            className="w-full"
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">Email Address *</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full"
            disabled={saving}
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !email.trim()}>
            {saving ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function InviteAgentsPage() {
  const addToast = useToastStore((s) => s.addToast);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detailInvitation, setDetailInvitation] = useState<Invitation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResendingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = async (p: number, s: string) => {
    setLoading(true);
    try {
      const data = await fetchInvitations({ page: p, pageSize: PAGE_SIZE, search: s });
      setInvitations(data.results);
      setTotal(data.count);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load invitations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page, search);
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInviteSubmit = async (email: string, name: string) => {
    setSaving(true);
    try {
      const created = await sendInvitation(email, name);
      addToast({ type: 'success', message: `Invitation sent to ${created.email}.` });
      setInviteOpen(false);
      setPage(1);
      await load(1, search);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send invitation.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    setResendingId(inv.id);
    try {
      const updated = await resendInvitation(inv.id);
      setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      addToast({ type: 'success', message: `Invitation resent to ${inv.email}.` });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to resend invitation.' });
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvitation(deleteTarget.id);
      addToast({ type: 'success', message: `Invitation to ${deleteTarget.email} deleted.` });
      setDeleteTarget(null);
      const newPage = invitations.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      await load(newPage, search);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete invitation.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block
        title="Invite Agents"
        description="Send and manage invitations to new agents."
        titleVariant="h5"
        className="flex-shrink-0"
        // actions={
          // <Button onClick={() => setInviteOpen(true)}>+ Invite Agent</Button>
        // }
      />

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex flex-shrink-0 items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email…"
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1d25]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500 dark:text-white/50">
            Loading invitations…
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500 dark:text-white/50">
            <span className="text-3xl">✉️</span>
            <p className="text-sm">No invitations found.</p>
            <Button size="sm" onClick={() => setInviteOpen(true)}>Send first invitation</Button>
          </div>
        ) : (
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Sent
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Expires
                </th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv, idx) => (
                <tr
                  key={inv.id}
                  className={`group border-b  transition-colors hover:bg-slate-50 dark:border-white/6 dark:hover:bg-slate-700/55 ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/35'
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-slate-900 group-hover:text-slate-900 dark:text-white dark:group-hover:text-white">
                    {inv.to_name || <span className="text-slate-400 dark:text-white/40">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600 group-hover:text-slate-700 dark:text-white/70 dark:group-hover:text-white/90">{inv.email}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-500 group-hover:text-slate-700 dark:text-white/50 dark:group-hover:text-white/85">{formatDate(inv.created_at)}</td>
                  <td className="px-5 py-3 text-slate-500 group-hover:text-slate-700 dark:text-white/50 dark:group-hover:text-white/85">{formatDate(inv.expires_at)}</td>
                  <td className="px-3 py-3">
                    {resending === inv.id ? (
                      <span className="text-xs text-slate-400 dark:text-white/40">…</span>
                    ) : (
                      <RowMenu
                        invitation={inv}
                        onResend={handleResend}
                        onViewDetail={setDetailInvitation}
                        onDelete={setDeleteTarget}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && invitations.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPage={handlePageChange}
          />
        )}
      </div>

      {/* Modals */}
      <InviteModal
        open={inviteOpen}
        saving={saving}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInviteSubmit}
      />

      <DetailModal
        invitation={detailInvitation}
        onClose={() => setDetailInvitation(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete Invitation"
        message={`Delete the invitation sent to ${deleteTarget?.email ?? ''}? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
