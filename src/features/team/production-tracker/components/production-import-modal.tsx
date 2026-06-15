import { Button, Modal } from '@/shared/components';
import { SAMPLE_IMPORT_FILE_URL, SAMPLE_IMPORT_PRODUCTS, type ProductionImportFailure } from '../production-csv';

export function ProductionImportModal({
  open,
  importing,
  importFile,
  importFailures,
  importSuccessCount,
  onClose,
  onFileChange,
  onSubmit,
}: {
  open: boolean;
  importing: boolean;
  importFile: File | null;
  importFailures: ProductionImportFailure[];
  importSuccessCount: number;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Import CSV File"
      onClose={onClose}
      contentClassName="max-w-[640px]"
    >
      <div className="space-y-5 text-slate-900 dark:text-white">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-[10px] file:border file:border-amber-300 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-100 dark:text-white dark:file:border-[rgba(255,215,0,.35)] dark:file:bg-[rgba(255,215,0,.18)] dark:file:text-[#ffd700] dark:hover:file:bg-[rgba(255,215,0,.26)]"
          />
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-[#f7f0d3]">
            Available Products: {SAMPLE_IMPORT_PRODUCTS}
          </p>
          <div className="mt-4 text-center">
            <a
              href={SAMPLE_IMPORT_FILE_URL}
              download
              className="text-sm font-semibold text-amber-700 underline underline-offset-4 transition-opacity hover:opacity-80 dark:text-[#ffd700]"
            >
              Download Sample File
            </a>
          </div>
        </div>

        {(importSuccessCount > 0 || importFailures.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            {importSuccessCount > 0 && (
              <p className="text-sm text-green-700 dark:text-[#9fe870]">Imported {importSuccessCount} record{importSuccessCount === 1 ? '' : 's'}.</p>
            )}
            {importFailures.length > 0 && (
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm text-red-700 dark:text-red-200">
                {importFailures.map((failure) => (
                  <div key={`${failure.rowNumber}-${failure.clientName}`} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-400/20 dark:bg-red-500/10">
                    Row {failure.rowNumber} ({failure.clientName}): {failure.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={onSubmit} disabled={importing || !importFile}>
            {importing ? 'Importing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}