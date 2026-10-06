import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { WelcomeVideosLibrary } from '../components/welcome-videos-library';
import type { WelcomeVideo } from '../types';

/**
 * `/welcome-videos` and `/welcome-videos/:videoKey`.
 *
 * Every role sees all eight. The open player lives in the URL, so a link to one video
 * lands on that video and the back button closes it. The sidebar no longer lists this
 * page — it is a section of File Vault — but the Home card and old links still land here.
 */
export default function WelcomeVideosPage() {
  const { videoKey } = useParams<{ videoKey?: string }>();
  const navigate = useNavigate();

  const play = useCallback((video: WelcomeVideo) => navigate(`/welcome-videos/${video.key}`), [navigate]);
  const close = useCallback(() => navigate('/welcome-videos'), [navigate]);

  return <WelcomeVideosLibrary openKey={videoKey ?? null} onPlay={play} onClose={close} />;
}
