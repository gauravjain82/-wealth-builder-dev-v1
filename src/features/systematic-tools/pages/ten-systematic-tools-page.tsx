import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/shared/components';
import { SystematicToolsBrowser } from '../components/systematic-tools-browser';
import { useSystematicTools } from '../hooks/use-systematic-tools';
import { clearLegacyToolMenus } from '../services/systematic-tools-service';

const DEFAULT_TITLE = '10 Systematic Tools';

/**
 * "10 Systematic Tools" for the current user.
 *
 * Tools and their contents are managed in Admin → 10 Systematic Tools; the
 * backend already filters them by the user's roles.
 */
export default function TenSystematicToolsPage() {
  const { data, isLoading, isError, error, refetch } = useSystematicTools();

  // The old in-page editor saved menus to localStorage; they are obsolete now.
  useEffect(() => {
    clearLegacyToolMenus();
  }, []);

  if (isLoading) {
    return (
      <div className="vault">
        <div className="col-span-full">
          <LoadingState title="Loading tools" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="vault">
        <div className="col-span-full p-6">
          <ErrorState
            title="Unable to load the 10 Systematic Tools"
            description={error instanceof Error ? error.message : 'Something went wrong.'}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  return (
    <SystematicToolsBrowser
      title={data.config.page_title || DEFAULT_TITLE}
      tools={data.tools}
      headerActions={
        data.can_manage ? (
          <Link to="/admin/systematic-tools" className="glass-btn vault-manage-link">
            Manage tools
          </Link>
        ) : null
      }
    />
  );
}
