import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

const CHUNK_RELOAD_KEY = 'wbd:chunk-reload-attempted';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

function isChunkLoadError(error: unknown) {
  const message = getErrorMessage(error);

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Unable to preload CSS')
  );
}

function RouteErrorFallback() {
  const error = useRouteError();
  const isMissingBuildAsset = isChunkLoadError(error);

  useEffect(() => {
    if (!isMissingBuildAsset) {
      return;
    }

    const reloadKey = `${CHUNK_RELOAD_KEY}:${window.location.pathname}${window.location.search}:${getErrorMessage(
      error
    )}`;

    if (sessionStorage.getItem(reloadKey)) {
      return;
    }

    sessionStorage.setItem(reloadKey, 'true');
    window.location.reload();
  }, [error, isMissingBuildAsset]);

  const title = isMissingBuildAsset ? 'Updating app...' : 'Something went wrong';
  const description = isMissingBuildAsset
    ? 'A new version was deployed. We are refreshing this page so the latest files can load.'
    : isRouteErrorResponse(error)
      ? error.statusText
      : getErrorMessage(error) || 'Please refresh the page and try again.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-md rounded-lg border border-white/10 bg-white/5 p-6 text-center shadow-xl">
        <h1 className="mb-3 text-xl font-semibold">{title}</h1>
        <p className="mb-5 text-sm text-slate-300">{description}</p>
        <button
          type="button"
          className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
    </div>
  );
}

export { CHUNK_RELOAD_KEY, RouteErrorFallback };
