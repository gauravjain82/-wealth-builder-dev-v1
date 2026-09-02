export function isVideoHref(href = ''): boolean {
  const v = href.toLowerCase();
  return (
    v.includes('youtube.com') ||
    v.includes('youtu.be') ||
    v.includes('vimeo.com') ||
    v.includes('drive.google.com') ||
    v.includes('docs.google.com') ||
    v.endsWith('.mp4') ||
    v.includes('/preview')
  );
}

export function shouldUseIframe(href = ''): boolean {
  const v = href.toLowerCase();
  return (
    v.includes('drive.google.com') ||
    v.includes('docs.google.com') ||
    v.includes('youtube.com') ||
    v.includes('youtu.be') ||
    v.includes('vimeo.com')
  );
}

/** Strip fullscreen and branding affordances so training media stays in-app. */
export function lockedPlayerSrc(href = ''): string {
  if (!href) return href;
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      url.searchParams.set('fs', '0');
      url.searchParams.set('modestbranding', '1');
      url.searchParams.set('rel', '0');
      return url.toString();
    }
    if (host.includes('vimeo.com')) {
      url.searchParams.set('fullscreen', '0');
      return url.toString();
    }
    return url.toString();
  } catch {
    return href;
  }
}
