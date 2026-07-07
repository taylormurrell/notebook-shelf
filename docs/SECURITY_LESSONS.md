# Security lessons: patterns to recognize

Five vulnerability patterns found during a security review of this project,
generalized so they're recognizable in any future project, not just the
specific bug that surfaced them. Each checkbox item in `SECURITY_CHECKLIST.md`
traces back to one of these. Read that doc for the "what to check"; read this
one for the "why it happens" and "how to spot it."

## 1. The half-checked ownership chain

**Pattern:** A row links to two different parent records, but the security
rule only verifies you own *one* of them, so you can pair something you
legitimately own with something you don't.

**Simple version:** A permission check that confirms "this piece is yours" but
forgets to also confirm "and it's attached to the right larger thing," so you
can attach your own valid piece to someone else's thing.

**Analogy:** A library where you're only allowed to bookmark books on your own
shelf. The rule enforced was "you can put a bookmark in any book that exists
somewhere in the library." Nobody checked *whose shelf* that book was actually
sitting on. You could sneak a bookmark into a stranger's book as long as the
bookmark itself was yours.

**How to spot it:** Any time a table has *two or more* foreign keys pointing
at different things (e.g., a tag that references both a note and a notebook,
a comment that references both a post and a thread), ask: does the security
rule check that **all** of those references belong to the same owner, and
that they're actually consistent with each other, not just that each one
individually traces back to something the caller owns?

## 2. The door that fails open

**Pattern:** A safety check has a "config is missing" escape hatch meant for
local development convenience, but in production, that same escape hatch
means the safety check silently turns itself off instead of raising an alarm.

**Simple version:** "If something's broken, let everyone through" instead of
"if something's broken, lock the door and yell."

**Analogy:** A building's keycard reader should fail by keeping the door
**locked** if it loses power. That's the safe failure direction. This one was
wired to fail by holding the door **open** instead.

**How to spot it:** Anywhere code says "if X isn't configured, skip this
check," ask what happens if X is *accidentally* unconfigured on a real, live
deployment (a typo'd environment variable, a config that didn't get set). The
dev-convenience case and the "something is actually broken in production"
case often look identical to the code, so the code needs to tell them apart
(e.g., branch on environment, not just on whether the value is present).

## 3. The mailbox with no size limit

**Pattern:** A field a user can type into has no upper bound on size, either
in the app or the database.

**Simple version:** Nothing stops one submission from being enormous.

**Analogy:** A mailbox with no size limit on the slot: someone can stuff a
couch through it. Most mail carriers never try, but the slot should still be
sized for mail.

**How to spot it:** For every free-text field a user fills in, ask "what
happens if this were a million characters instead of a paragraph?" Slow
queries, storage bloat, or (for generated/derived columns like search indexes)
outright errors once a size ceiling internal to the database is hit. Cap it in
two places: the app (so the user gets a friendly error) and the database
(so the cap holds no matter what code path writes to it).

## 4. The doorman who only checks ID once

**Pattern:** Data gets validated when it's *written*, but is trusted
unconditionally when it's *displayed* later, with no re-check at the point
where it actually gets used in a sensitive way (rendered as a link, loaded as
an image, etc.).

**Simple version:** "We checked this was safe when we saved it" is not the
same guarantee as "this is still safe right now." Something could have
changed the data since (a bug in a different code path, a direct database
edit, a future feature that writes to the same table without knowing about
the original validation).

**Analogy:** A bouncer who checks ID at the door once, then lets that same
person back in all night through a side entrance with no further checks,
because "we already verified them earlier."

**How to spot it:** Anywhere stored data flows into an `href`, `src`, or
similar attribute that the browser will *act on* (navigate to, fetch, embed),
ask whether that specific line of code re-validates the value, or whether
it's silently relying on validation that happened somewhere else, earlier, in
a different function. If it's the latter, add the cheap re-check. It's a
few lines and it means one future mistake elsewhere can't become a live bug.

## 5. The smoke detector that only recognizes one kind of smoke

**Pattern:** Error handling is written broadly ("if anything goes wrong, just
return empty/nothing") to gracefully handle one specific, expected failure,
but the same broad handling also silently hides every *other*, unexpected
failure.

**Simple version:** Code that's quiet on purpose for one known, harmless
reason ends up quiet by accident for every other reason too, including real
bugs and permission failures you'd actually want to know about.

**Analogy:** A smoke detector engineered to only go off for one very specific
kind of smoke, and to stay completely silent for every other kind of fire,
including the ones that actually matter.

**How to spot it:** Whenever you write a `try/catch` or an `error ? ignore :
...` specifically to smooth over one known, benign case (like "this table
doesn't exist yet during incremental setup"), check the *specific* condition
for that one case. Don't catch everything. Let genuinely unexpected failures
at least get logged (by error code, never by logging the actual sensitive
content) so they're visible instead of invisible.

## The underlying discipline

All five of these share one root cause: code that was correct for the
*expected* path but hadn't been asked "what if a caller skips the UI and hits
the API/database directly, or what if this exact assumption turns out to be
wrong?" That question is worth asking explicitly, on purpose, before calling
any auth- or data-related feature done, not just relying on it surfacing
naturally while building the happy path.
