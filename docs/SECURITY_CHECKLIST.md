# Security checklist for new projects

Applies to any app with user accounts, a database, or both (Supabase, Postgres,
or similar). Read this before writing auth/data-access code on a new project,
and re-check it before calling an MVP "done." Written after a security review
of this project found real gaps in several areas below.

**Mental model:** enabling RLS turns on the lock. Policies decide who gets the
key. You need both, and for Supabase specifically, whether the API can reach
a table at all is a *third*, separate switch (see Data API Grants below).

## Supabase project configuration (do this once, up front)

- [ ] New project lives in an org/workspace you clearly control; don't reuse
      an old, paused, or "whose is this" project.
- [ ] Region set closest to your actual users.
- [ ] Default Postgres, not an alpha/experimental database option, for an MVP.
- [ ] **Data API**: on (needed for the client library to reach Postgres at all).
- [ ] **Automatically expose new tables**: default to **off**, and add explicit
      `GRANT` statements to `authenticated` for each table instead (see Data
      API Grants below). This is stricter than relying on RLS alone. Treat it
      as the default for new projects.
- [ ] **Enable automatic RLS**: on. A safety net that auto-enables RLS on any
      new table, so nothing can go live without it even if a migration forgets.
- [ ] Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key go in
      `.env.local`. Never the Project ID, service role key, database password,
      or JWT secret.
- [ ] `.env.local` is confirmed git-ignored *before* real values are added to it.
- [ ] Restart the dev server after any environment variable change (stale
      values are a common source of confusing 401s).

## Database / Row Level Security

- [ ] RLS is enabled on every table that holds user data.
- [ ] Every user-owned table has `user_id` with `default auth.uid()`: the
      client never sends `user_id`; the database fills it in from the session.
- [ ] Every policy wraps `auth.uid()` as `(select auth.uid())` (evaluated once
      per query, not once per row, a Supabase-recommended perf practice).
- [ ] `WITH CHECK` exists on every write policy, not just `USING` (reads).
- [ ] **Child tables verify the full ownership chain, not just the nearest
      link.** If table B references table A which references the user, a write
      to B must confirm both that A belongs to the user and that B's foreign
      keys actually point at that specific A, not just that A exists. (Real bug
      found: a table could be linked to someone else's parent row as long as
      the other foreign key pointed at something the caller owned.)
- [ ] `ON DELETE CASCADE` on child foreign keys, so deleting a parent cleans up
      everything under it, leaving no orphaned rows.
- [ ] Every table has a reasonable server- or DB-level length/size cap on any
      free-text field a user can fill unboundedly (notes, descriptions, etc.).
      Enforce it in the app AND as a DB `CHECK` constraint, since the DB
      constraint holds even if a future code path forgets the app-level check.
- [ ] Tables are created through a checked-in SQL migration file, not one-off
      manual dashboard edits, so the schema has a history and can be replayed.
- [ ] `updated_at` triggers exist on any table the app sorts or displays by
      last-modified time.

## Data API Grants (separate from RLS!)

If "Automatically expose new tables" is off, a table can show **API DISABLED**
even with perfect RLS policies. RLS controls *which rows*; GRANT controls
*whether the API can reach the table at all*. For private, user-owned tables:

```sql
grant usage on schema public to authenticated;
grant select, insert, update, delete on <table_name> to authenticated;
```

- [ ] Grants go to `authenticated`, not `anon`, for any private table.
- [ ] After granting, confirm the table no longer shows API DISABLED in the
      dashboard.

## Auth

- [ ] Route protection (middleware/proxy) **fails closed**: if required env
      vars or config are missing in production, the app blocks access or
      errors. It never silently skips the auth check and lets requests
      through unauthenticated.
- [ ] The same fail-closed check exists in at least one more place as defense
      in depth (e.g., the protected page itself), not only in middleware.
- [ ] Only the anon/publishable key is ever used in client-side code. The
      service-role key is never imported outside of trusted server contexts
      (and ideally never used at all in a simple app, since RLS should be enough).
- [ ] Passwords require a reasonable minimum length (8+), set both in the
      client-side form AND in the auth provider's dashboard/policy settings.
      Client-side alone is not enforced server-side.
- [ ] API routes / server actions check the authenticated user before reading
      or mutating data (RLS is the real backstop, but the server code shouldn't
      blindly assume a caller is who they claim without an explicit check where
      it matters, e.g. before returning something sensitive).

## File storage / uploads (skip if the app has no uploads)

- [ ] Storage buckets are created explicitly (dashboard or migration); private
      by default. Only make a bucket public if you genuinely want anyone with
      the URL to view its contents.
- [ ] The database stores the **storage path** for a private file (e.g.
      `user-id/timestamp.jpg`), never a public URL or a signed URL.
- [ ] Private files are served via a **signed URL generated server-side at
      fetch time** (`createSignedUrl()`). Never `getPublicUrl()` for a private
      bucket. Signed URLs expire; that's expected, don't store them.
- [ ] Externally scraped image URLs that are already public web URLs (e.g. a
      YouTube thumbnail) can be linked to directly; they don't need a bucket.

## Untrusted input & rendering

- [ ] User-entered text (notes, comments, names, labels) is stored and
      rendered as plain text, never `dangerouslySetInnerHTML` or equivalent.
- [ ] Any URL a user pastes/enters is validated against an `http`/`https`
      allowlist before being saved (blocks `javascript:`, `data:`, etc.).
- [ ] External links open with `target="_blank" rel="noopener noreferrer"`.
- [ ] Anything rendered as an `<img src>`, `href`, or similar "executable"
      attribute is **re-validated at render time**, not just trusted because
      it passed validation once at write time. This is defense in depth against
      a future write path (or a row edited directly via the database API)
      skipping that validation.
- [ ] Link/embed previews store metadata only (title, thumbnail URL, id);
      never raw scraped HTML or embedded third-party scripts.

## Error handling

- [ ] Broad `try/catch` or `?? []`/`?? null` fallbacks around database calls
      are narrowed to the *specific* expected failure (e.g., "table doesn't
      exist yet" during incremental migrations), not "swallow every error
      silently." Unexpected errors should at least be logged (by error code,
      never by logging the actual user content/secrets).

## Headers & transport

- [ ] A Content-Security-Policy is set, scoped to the actual origins the app
      talks to (its own API, the specific external CDNs it embeds images
      from), not a wide-open policy.
- [ ] `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-
      Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy` are
      all set.
- [ ] Secrets: `.env.local` (or equivalent) is git-ignored and never committed;
      `.env.example` has placeholders only; no API keys or credentials are
      hardcoded anywhere in source.
- [ ] Never print, paste, or screenshot the contents of `.env.local` into
      chat, logs, tickets, or a shared doc, including when asking for help.

## Deployment (once local is fully working)

- [ ] Don't wire up Vercel (or any host) until the local app is fully working.
      Get local right first.
- [ ] Same `NEXT_PUBLIC_SUPABASE_URL` / anon key go into the host's environment
      variables. The service-role key never goes into a client-exposed env var.
- [ ] After deploying, explicitly test auth callbacks, login/logout, and any
      redirect logic. Production URLs and cookie behavior can differ from
      local dev in ways that break auth silently.

## Common problems & fixes (Supabase-specific)

| Symptom | Likely cause | Fix |
|---|---|---|
| Table shows API DISABLED | Missing `GRANT` statements | Grant table access to `authenticated`, keep RLS policies |
| 401 / invalid credentials | Wrong env var, or stale dev server | Re-check Project URL + anon key, restart dev server |
| 403 on uploaded images | Private bucket used with `getPublicUrl()` | Store the path, generate a signed URL on fetch |
| User sees no rows | RLS policy too strict, or row missing `user_id` | Inspect the policy; confirm rows have the right `user_id` |
| Anyone can read rows | RLS disabled, or a bad `anon` grant | Enable RLS, tighten policies, remove `anon` grants on private data |
| Env values leaked | `.env.local` printed/screenshotted or committed | Rotate the affected keys; scrub from git history if committed |

## Process

- [ ] Before calling any project "done," do a dedicated security pass: re-read
      every RLS policy against "could a logged-in user, calling the API
      directly instead of through the UI, do something they shouldn't?" That
      question, not just whether the UI prevents it, is what catches the RLS
      gaps above.
- [ ] Prefer small, reversible, checked-in migrations over hidden dashboard
      defaults or one-off manual edits, so every schema/security change has a
      diff and a history.
