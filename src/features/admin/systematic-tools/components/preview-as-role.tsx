import { useState } from 'react';
import { Button, Modal, Select } from '@/shared/components';
import { SystematicToolsBrowser } from '@/features/systematic-tools/components/systematic-tools-browser';
import type { SystematicToolsResponse } from '@/features/systematic-tools/types';
import type { RoleOption } from '@/features/admin/content-pages/types';
import { previewSystematicToolsAsRole } from '../services/systematic-tools-admin-service';

type PreviewAsRoleProps = {
  roleOptions: RoleOption[];
};

/**
 * "Preview as <role>": renders the user page as someone holding only that
 * role sees it, so admins can check "Visible to" without switching accounts.
 */
export function PreviewAsRole({ roleOptions }: PreviewAsRoleProps) {
  const [role, setRole] = useState('NEW_AGENT');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SystematicToolsResponse | null>(null);

  const selectedRole = roleOptions.some((option) => option.name === role)
    ? role
    : (roleOptions[0]?.name ?? role);
  const roleLabel = roleOptions.find((option) => option.name === selectedRole)?.label ?? selectedRole;

  const showPreview = async () => {
    setOpen(true);
    setLoading(true);
    setError('');
    setData(null);
    try {
      setData(await previewSystematicToolsAsRole(selectedRole));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/70" htmlFor="st-preview-role">
          Preview as
        </label>
        <Select
          id="st-preview-role"
          className="w-44"
          value={selectedRole}
          onChange={(event) => setRole(event.target.value)}
        >
          {roleOptions.map((option) => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => void showPreview()}>
          Preview
        </Button>
      </div>

      <Modal
        open={open}
        title={`Preview as ${roleLabel}`}
        subtitle="What someone with only this role sees on the 10 Systematic Tools page. Hidden tools and content are left out. Cards are not clickable here."
        onClose={() => setOpen(false)}
        contentClassName="!max-w-6xl"
        dismissible
      >
        {loading && <p className="p-6 text-sm text-white/60">Loading preview…</p>}
        {error && <p className="p-6 text-sm text-red-400">{error}</p>}
        {data && (
          <SystematicToolsBrowser
            key={selectedRole}
            title={data.config.page_title || '10 Systematic Tools'}
            tools={data.tools}
            interactive={false}
            className="vault-preview"
          />
        )}
      </Modal>
    </>
  );
}
