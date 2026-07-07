// Pure helpers for link + YouTube handling. No server imports, so both server
// actions and client components can use these.

export type LinkSourceType = "url" | "youtube";

export type LinkRecord = {
  id: string;
  noteId: string;
  url: string;
  sourceType: LinkSourceType;
  title: string | null;
  youtubeVideoId: string | null;
  youtubeTimestampSeconds: number | null;
};

type LinkRow = {
  id: string;
  note_id: string;
  url: string;
  source_type: string;
  title: string | null;
  youtube_video_id: string | null;
  youtube_timestamp_seconds: number | null;
};

export const LINK_SELECT =
  "id, note_id, url, source_type, title, youtube_video_id, youtube_timestamp_seconds";

export function rowToLink(r: LinkRow): LinkRecord {
  return {
    id: r.id,
    noteId: r.note_id,
    url: r.url,
    sourceType: r.source_type === "youtube" ? "youtube" : "url",
    title: r.title,
    youtubeVideoId: r.youtube_video_id,
    youtubeTimestampSeconds: r.youtube_timestamp_seconds,
  };
}

// Only http/https URLs are allowed — blocks javascript:, data:, etc.
export function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

// Extract unique, safe http(s) URLs from plain text, trimming trailing
// punctuation that commonly follows a pasted link.
export function extractSafeUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  const cleaned = found.map((u) => u.replace(/[.,);\]]+$/, ""));
  return Array.from(new Set(cleaned.filter(isSafeHttpUrl)));
}

// Parse a YouTube time param: "90", "90s", "1m30s", "1h2m3s".
export function parseTimestampSeconds(raw: string): number | null {
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return n > 0 ? n : null;
  }
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!m) return null;
  const seconds =
    parseInt(m[1] || "0", 10) * 3600 +
    parseInt(m[2] || "0", 10) * 60 +
    parseInt(m[3] || "0", 10);
  return seconds > 0 ? seconds : null;
}

// Detect a YouTube link and pull out the video id + optional timestamp.
export function parseYouTube(
  raw: string,
): { videoId: string; timestampSeconds: number | null } | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? null;
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? null;
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const t = u.searchParams.get("t") ?? u.searchParams.get("start");
  return { videoId: id, timestampSeconds: t ? parseTimestampSeconds(t) : null };
}

// Standard thumbnail URL from a video id — avoids needing the YouTube API.
export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const path = u.pathname === "/" ? "" : u.pathname;
    const s = u.hostname.replace(/^www\./, "") + path;
    return s.length > 48 ? s.slice(0, 47) + "…" : s;
  } catch {
    return raw;
  }
}
