/**
 * The drip links are unlisted Vimeo pages, `https://vimeo.com/<id>/<hash>`. The player
 * needs the hash as `?h=`, or an unlisted video refuses to embed.
 */
export function vimeoEmbedUrl(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.hostname.replace(/^www\./, '') !== 'vimeo.com') return null;
    const [id, hash] = url.pathname.split('/').filter(Boolean);
    if (!id || !/^\d+$/.test(id)) return null;
    const embed = new URL(`https://player.vimeo.com/video/${id}`);
    if (hash) embed.searchParams.set('h', hash);
    embed.searchParams.set('autoplay', '1');
    return embed.toString();
  } catch {
    return null;
  }
}
