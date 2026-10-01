import { Button, Modal } from '@/shared/components';
import { useToastStore } from '@/store';

import { useWelcomeVideos } from '../hooks/use-welcome-videos';
import type { WelcomeVideo } from '../types';
import { canNativeShare, copyText, shareAllText, shareText, videoLabel } from '../utils/share';

interface ShareWelcomeVideosModalProps {
  /** The agent the links are for. `null` keeps the dialog closed. */
  recipientName: string | null;
  /** Shown after an agency code is added: the drip has just started for this agent. */
  justActivated?: boolean;
  onClose: () => void;
}

/**
 * Where leaders work with an agent — after adding an agency code, or from the prospect's
 * action panel — copy or share any of the eight welcome videos without leaving the page.
 */
export function ShareWelcomeVideosModal({
  recipientName,
  justActivated = false,
  onClose,
}: ShareWelcomeVideosModalProps) {
  const open = recipientName !== null;
  const { data: videos = [], isLoading, isError } = useWelcomeVideos();
  const { addToast } = useToastStore();

  const copy = async (text: string, what: string) => {
    const ok = await copyText(text);
    addToast(
      ok
        ? { type: 'success', message: `${what} copied.` }
        : { type: 'error', message: 'Could not copy.' }
    );
  };

  const share = async (video: WelcomeVideo) => {
    try {
      await navigator.share({ title: videoLabel(video), text: shareText(video) });
    } catch {
      // Dismissed share sheet.
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible
      title="Share welcome videos"
      subtitle={recipientName || undefined}
      contentClassName="max-w-[640px] flex flex-col max-h-[90vh]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <p className="m-0 text-sm text-slate-600 dark:text-gray-300">
          {justActivated
            ? 'Agency code added. These eight videos now go out by text and Telegram, one every two days. Send any of them now:'
            : 'Copy a link to send by text, WhatsApp or Telegram. The links open without signing in.'}
        </p>

        {isLoading ? <p className="m-0 text-sm text-slate-500 dark:text-gray-400">Loading videos…</p> : null}
        {isError ? (
          <p className="m-0 text-sm text-red-600 dark:text-red-400">Unable to load the videos.</p>
        ) : null}

        <ol className="m-0 flex-1 list-none overflow-y-auto p-0">
          {videos.map((video, index) => (
            <li
              key={video.key}
              className="flex items-center justify-between gap-3 border-b border-slate-200 py-2 last:border-b-0 dark:border-white/10"
            >
              <span className="min-w-0 text-sm">
                <span className="mr-2 font-semibold text-amber-600 dark:text-[#ffdd45]">{index + 1}.</span>
                {videoLabel(video)}
              </span>
              <span className="flex flex-none gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => copy(video.video_url, 'Link')}>
                  Copy
                </Button>
                {canNativeShare() ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => share(video)}>
                    Share
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>
            CLOSE
          </Button>
          <Button
            type="button"
            disabled={videos.length === 0}
            onClick={() => copy(shareAllText(videos), 'All links')}
          >
            COPY ALL LINKS
          </Button>
        </div>
      </div>
    </Modal>
  );
}
