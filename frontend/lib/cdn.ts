/** Cloudflare R2 CDN base URL for all media assets (videos, audio, images). */
export const CDN_BASE = "https://pub-11a5165846774aa88a1202297cadc9a0.r2.dev";

/** Cache-bust query string — changes on each build to force browsers to fetch fresh assets. */
export const CACHE_V = process.env.NEXT_PUBLIC_CACHE_BUST || "1";

/** Append cache-bust param to any URL. */
export function cb(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${CACHE_V}`;
}
