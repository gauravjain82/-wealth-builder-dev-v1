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
      <div className="space-y-5 text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            className="block w-full text-sm text-white file:mr-4 file:rounded-[10px] file:border file:border-[rgba(255,215,0,.35)] file:bg-[rgba(255,215,0,.18)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#ffd700] hover:file:bg-[rgba(255,215,0,.26)]"
          />
          <p className="mt-4 text-center text-sm text-[#f7f0d3]">
            Available Products: {SAMPLE_IMPORT_PRODUCTS}
          </p>
          <div className="mt-4 text-center">
            <a
              href={SAMPLE_IMPORT_FILE_URL}
              download
              className="text-sm font-semibold text-[#ffd700] underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              Download Sample File
            </a>
          </div>
        </div>

        {(importSuccessCount > 0 || importFailures.length > 0) && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            {importSuccessCount > 0 && (
              <p className="text-sm text-[#9fe870]">Imported {importSuccessCount} record{importSuccessCount === 1 ? '' : 's'}.</p>
            )}
            {importFailures.length > 0 && (
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm text-red-200">
                {importFailures.map((failure) => (
                  <div key={`${failure.rowNumber}-${failure.clientName}`} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2">
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