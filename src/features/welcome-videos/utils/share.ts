import type { WelcomeVideo } from '../types';

/** "Title — Speaker", or just the title when no speaker is named. */
export function videoLabel(video: WelcomeVideo): string {
  return video.speaker ? `${video.title} — ${video.speaker}` : video.title;
}

/** What a leader pastes to an agent: the label and the Vimeo link. */
export function shareText(video: WelcomeVideo): string {
  return `${videoLabel(video)}\n${video.video_url}`;
}

/** Every video, numbered, for sending the whole set in one message. */
export function shareAllText(videos: WelcomeVideo[]): string {
  return videos.map((v, i) => `${i + 1}. ${videoLabel(v)}\n${v.video_url}`).join('\n\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older mobile browsers and non-secure origins have no async clipboard.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
