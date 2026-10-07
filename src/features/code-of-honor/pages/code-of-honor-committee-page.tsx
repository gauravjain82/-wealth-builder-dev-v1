/**
 * `/code-of-honor/committee` — the culture committee's review screen and the
 * administrators' rules and values, on their own page (not in the Home v2 card).
 * Guarded by `CodeOfHonorRoute`; each section also checks its own capability, and the
 * backend enforces every one of them independently.
 */

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';

import '../code-of-honor.css';
import { AdminPanel } from '../components/admin-panel';
import { CommitteePanel } from '../components/committee-panel';
import { ErrorNotice, Loading } from '../components/states';
import { useCodeOfHonorAccess } from '../hooks/use-code-of-honor';

type Section = 'committee' | 'admin';

export default function CodeOfHonorCommitteePage() {
  const access = useCodeOfHonorAccess();
  const caps = new Set(access.data?.capabilities ?? []);
  const canReview = caps.has('code_of_honor.review');
  const canSettings = caps.has('code_of_honor.manage_settings');
  const canValues = caps.has('code_of_honor.manage_values');
  const canAdmin = canSettings || canValues;
  const [chosen, setChosen] = useState<Section | null>(null);
  const section: Section = chosen ?? (canReview ? 'committee' : 'admin');

  if (access.isLoading) return <Loading label="Loading Code of Honor" />;
  if (access.isError) return <ErrorNotice error={access.error} onRetry={() => access.refetch()} />;

  return (
    <div className="wb-coh-page">
      <header className="wb-coh-page__header">
        <h1 className="wb-coh-page__title">Code of Honor</h1>
        <div className="wb-coh-tabs" role="tablist" aria-label="Code of Honor administration">
          {canReview && (
            <Button type="button" role="tab" aria-selected={section === 'committee'}
              variant={section === 'committee' ? 'default' : 'outline'} onClick={() => setChosen('committee')}>
              Committee
            </Button>
          )}
          {canAdmin && (
            <Button type="button" role="tab" aria-selected={section === 'admin'}
              variant={section === 'admin' ? 'default' : 'outline'} onClick={() => setChosen('admin')}>
              Admin
            </Button>
          )}
        </div>
      </header>
      {section === 'committee' && canReview && (
        <CommitteePanel
          canManageCycles={caps.has('code_of_honor.manage_cycles')}
          canComplete={caps.has('code_of_honor.complete_cycle')}
        />
      )}
      {section === 'admin' && canAdmin && <AdminPanel canSettings={canSettings} canValues={canValues} />}
    </div>
  );
}
