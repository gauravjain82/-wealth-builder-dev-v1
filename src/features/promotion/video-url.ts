/**
 * Turn a pasted YouTube or Vimeo page link into its embeddable player URL.
 * Anything else (a Firebase Storage file, an existing player URL) is returned as is.
 * Shared by the learner's player and the admin preview, so both play the same thing.
 */
export function getEmbedVideoUrl(src: string): string {
  if (!src) return src;

  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (host.includes("player.vimeo.com")) {
      return url.toString();
    }

    if (host.includes("youtu.be")) {
      const id = pathParts[0];
      return id ? `https://www.youtube.com/embed/${id}` : src;
    }

    if (host.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      return src;
    }

    if (host.includes("vimeo.com") && !host.includes("player.vimeo.com")) {
      const id = pathParts[0];
      if (!id) return src;
      const embedUrl = new URL(`https://player.vimeo.com/video/${id}`);
      const privateHash = pathParts[1] || url.searchParams.get("h");
      if (privateHash) embedUrl.searchParams.set("h", privateHash);
      return embedUrl.toString();
    }

    return src;
  } catch {
    return src;
  }
}
