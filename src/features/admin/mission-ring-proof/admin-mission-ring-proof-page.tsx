import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import {
  downloadMissionRingProofSubmissionsExcel,
  fetchMissionRingProofSubmissions,
  fetchMissionRingProofSummary,
  MissionRingProofSubmission,
  MissionRingProofSummary,
} from './mission-ring-proof-service';
import { Block, Input, Button } from '@/shared/components';

const PAGE_SIZE = 50;

const TH = 'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50';

/** "2026-08" → "Aug 2026". */
function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : '-';
}

/** Upload timestamp in the viewer's local time, e.g. "May 30, 2026, 2:29 PM". */
function formatDateTime(value: string | null | undefined): string {
  return value
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Upload time unknown';
}

/** To-date total plus a month-by-month breakdown of Mission Ring submitters. */
function MissionRingSummaryPanel({ summary }: { summary: MissionRingProofSummary | null }) {
  if (!summary) {
    return (
      <div className="flex-shrink-0 rounded-2xl border border-white/10 bg-[#1a1d25] p-4 text-sm text-white/50">
        Loading totals…
      </div>
    );
  }
  return (
    <div className="flex flex-shrink-0 flex-col gap-3 lg:flex-row">
      <div className="flex min-w-[220px] flex-col justify-center gap-1 rounded-2xl border border-amber-300/30 bg-[#1a1d25] p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Total Mission Rings to date
        </span>
        <span className="text-3xl font-bold text-amber-300">{summary.total_submitters}</span>
        <span className="text-xs text-white/50">{summary.total_proofs} proof files uploaded</span>
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          By month (counted in the month of each person's first proof)
        </p>
        {summary.monthly.length === 0 ? (
          <p className="text-sm text-white/50">No submissions yet.</p>
        ) : (
          <div className="flex gap-2">
            {summary.monthly.map((row) => (
              <div
                key={row.month}
                className="flex min-w-[88px] flex-col items-center rounded-xl bg-white/4 px-3 py-2"
                title={`${row.proofs} proof files uploaded in ${formatMonth(row.month)}`}
              >
                <span className="text-xs text-white/50">{formatMonth(row.month)}</span>
                <span className="text-lg font-semibold text-white">{row.submitters}</span>
              </div>
            ))}
          </div>
        )}
        {summary.undated_submitters > 0 && (
          <p className="mt-2 text-xs text-white/40">
            {summary.undated_submitters} submitter(s) have no upload date and are only in the total.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminMissionRingProofPage() {
  const [submissions, setSubmissions] = useState<MissionRingProofSubmission[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<MissionRingProofSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMissionRingProofSummary()
      .then(setSummary)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMissionRingProofSubmissions(page, PAGE_SIZE, search)
      .then((data) => {
        if (cancelled) return;
        setSubmissions(data.results);
        setCount(data.count);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstRow = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadMissionRingProofSubmissionsExcel(search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block
        title="Mission Ring Proof Submissions"
        description="View and manage all users' mission ring proof uploads."
        titleVariant="h5"
        className="flex-shrink-0"
      />

      <MissionRingSummaryPanel summary={summary} />

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex flex-shrink-0 flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email or agency code…"
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download size={16} className="mr-1.5" aria-hidden />
          {exporting ? 'Exporting…' : 'Export to Excel'}
        </Button>
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
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-white/50">
            <span className="text-3xl">💍</span>
            <p className="text-sm">No submissions found.</p>
          </div>
        ) : (
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Name</th>
                <th className={TH}>Agency Code</th>
                <th className={TH}>Email</th>
                <th className={TH}>Recruit Date</th>
                <th className={TH}>Attachments</th>
                <th className={TH}>No of Days</th>
                <th className="w-12 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission, idx) => (
                <tr
                  key={submission.user_id}
                  className={`border-b border-white/6 transition-colors hover:bg-white/4 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/2'}`}
                >
                  <td className="px-5 py-3 font-medium text-white">{submission.user_name}</td>
                  <td className="px-5 py-3 font-mono text-white/80">{submission.agency_code || '-'}</td>
                  <td className="px-5 py-3 text-white/70">{submission.user_email}</td>
                  <td className="px-5 py-3 text-white/50">{formatDate(submission.agency_code_assigned_at)}</td>
                  <td className="px-5 py-3">
                    {submission.attachments && submission.attachments.length > 0 ? (
                      <ul className="space-y-2">
                        {submission.attachments.map((file, i) => (
                          <li key={i} className="flex flex-col">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-300 underline hover:text-amber-200"
                              title={file.file_name}
                            >
                              {file.file_name}
                            </a>
                            <span className="text-xs text-white/45">
                              {formatDateTime(file.uploaded_at)}
                              {file.uploaded_by_name ? ` · by ${file.uploaded_by_name}` : ''}
                            </span>
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

      {/* Pagination */}
      <div className="flex flex-shrink-0 items-center justify-between text-sm text-white/60">
        <span>
          {count === 0 ? 'No results' : `Showing ${firstRow}–${lastRow} of ${count}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} aria-hidden />
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
