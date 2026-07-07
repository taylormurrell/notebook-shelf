import {
  youtubeThumbnail,
  formatTimestamp,
  prettyUrl,
  isSafeHttpUrl,
  type LinkRecord,
} from "@/lib/links";

// A YouTube video id is always exactly 11 URL-safe base64-ish characters.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// A compact card for a link attached to a note. YouTube links show a thumbnail
// and optional timestamp chip; other links show a small link glyph. All open in
// a new tab with safe attributes. Titles/URLs are rendered as text (escaped).
//
// url/videoId are re-validated here (not just trusted from the DB row) as
// defense in depth: they're written through validated helpers today, but this
// guards against a future write path — or a row edited directly via the
// Supabase API — introducing a javascript:/data: URL or a malformed video id.
export function LinkCard({ link }: { link: LinkRecord }) {
  const safeHref = isSafeHttpUrl(link.url) ? link.url : "#";
  const validVideoId =
    link.youtubeVideoId && YOUTUBE_ID_RE.test(link.youtubeVideoId)
      ? link.youtubeVideoId
      : null;
  const isYouTube = link.sourceType === "youtube" && validVideoId;

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 no-underline shadow-sm transition hover:bg-background"
    >
      {isYouTube ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={youtubeThumbnail(validVideoId)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-14 w-24 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background text-accent"
        >
          🔗
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm text-foreground">
          {link.title ?? (isYouTube ? "YouTube video" : prettyUrl(link.url))}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="truncate font-sans text-xs text-muted">
            {prettyUrl(link.url)}
          </span>
          {link.youtubeTimestampSeconds != null && (
            <span className="shrink-0 rounded-full bg-background px-2 py-0.5 font-sans text-[11px] text-accent">
              ▶ {formatTimestamp(link.youtubeTimestampSeconds)}
            </span>
          )}
        </span>
      </span>

      <span
        aria-hidden
        className="shrink-0 font-sans text-xs text-muted transition group-hover:text-accent"
      >
        ↗
      </span>
    </a>
  );
}
