import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-panel p-10 shadow-sm sm:p-14">
        <p className="font-sans text-sm uppercase tracking-[0.2em] text-muted">
          Welcome to
        </p>
        <h1 className="mt-3 font-serif text-4xl text-foreground sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-4 max-w-md font-sans text-base leading-relaxed text-muted">
          {APP_TAGLINE}
        </p>
        <div className="mt-8">
          <Link
            href="/app"
            className="inline-flex items-center rounded-full bg-foreground px-6 py-3 font-sans text-sm text-background transition hover:opacity-90"
          >
            Open your shelf
          </Link>
        </div>
      </div>
    </main>
  );
}
