export function isDirectVideoUrl(url = ''): boolean {
  try {
    const decoded = decodeURIComponent(url).toLowerCase();
    return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(decoded);
  } catch {
    return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url.toLowerCase());
  }
}
