import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { getNotebooks } from "@/lib/notebooks";
import { LogoutButton } from "@/components/logout-button";
import { NotebookShelf } from "@/components/notebook-shelf";
import { SearchBox } from "@/components/search-box";

// The proxy already gates this route, but we also read the user here (both to
// greet them / enable logout, and as defense in depth — this page must never
// render without a real signed-in user).
export default async function AppShelfPage() {
  let email: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? null;
  } else if (process.env.NODE_ENV === "production") {
    // Never render an unauthenticated shelf in production, even if the proxy
    // somehow didn't run (e.g. a future matcher change).
    throw new Error("Server misconfigured: Supabase env vars missing");
  }

  const notebooks = await getNotebooks();

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="font-serif text-xl text-foreground">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3">
          {email && (
            <span className="font-sans text-xs text-muted">{email}</span>
          )}
          {isSupabaseConfigured ? (
            <LogoutButton />
          ) : (
            <span className="rounded-full border border-border bg-panel px-3 py-1 font-sans text-xs text-muted">
              Supabase not configured
            </span>
          )}
        </div>
      </header>

      <section className="mx-auto mt-16 w-full max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Your shelf</h1>
            <p className="mt-2 font-sans text-sm text-muted">
              Hover a notebook to see its topic. Open one to start writing.
            </p>
          </div>
          <SearchBox />
        </div>

        <NotebookShelf notebooks={notebooks} />
      </section>
    </main>
  );
}
