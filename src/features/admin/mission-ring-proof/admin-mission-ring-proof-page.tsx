

import { useEffect, useState } from 'react';
import { fetchMissionRingProofSubmissions, MissionRingProofSubmission } from './mission-ring-proof-service';
import { Block, Input, Button } from '@/shared/components';


export default function AdminMissionRingProofPage() {
  const [submissions, setSubmissions] = useState<MissionRingProofSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMissionRingProofSubmissions();
        setSubmissions(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, []);

  const filtered = search
    ? submissions.filter((s) =>
        s.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.user_email?.toLowerCase().includes(search.toLowerCase())
      )
    : submissions;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block
        title="Mission Ring Proof Submissions"
        description="View and manage all users' mission ring proof uploads."
        titleVariant="h5"
        className="flex-shrink-0"
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
            onClick={() => { setSearchInput(''); setSearch(''); }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-[#1a1d25]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-white/50">
            Loading submissions…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-300">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-white/50">
            <span className="text-3xl">💍</span>
            <p className="text-sm">No submissions found.</p>
          </div>
        ) : (
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Recruit Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Attachments</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">No of Days</th>
                <th className="w-12 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((submission, idx) => (
                <tr
                  key={submission.user_id}
                  className={`border-b border-white/6 transition-colors hover:bg-white/4 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/2'}`}
                >
                  <td className="px-5 py-3 font-medium text-white">{submission.user_name}</td>
                  <td className="px-5 py-3 text-white/70">{submission.user_email}</td>
                  <td className="px-5 py-3 text-white/50">{submission.agency_code_assigned_at ? new Date(submission.agency_code_assigned_at).toLocaleDateString() : '-'}</td>
                  <td className="px-5 py-3">
                    {submission.attachments && submission.attachments.length > 0 ? (
                      <ul className="space-y-1">
                        {submission.attachments.map((file, i) => (
                          <li key={i}>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-300 underline hover:text-amber-200"
                              title={file.file_name}
                            >
                              {file.file_name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-white/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-left">{submission.days_count ?? '-'}</td>
                  <td className="px-3 py-3 text-left">{/* Add admin actions here if needed */}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
