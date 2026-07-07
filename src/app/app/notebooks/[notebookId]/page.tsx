import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotebook } from "@/lib/notebooks";
import { getNotes } from "@/lib/notes";
import { coverStyle } from "@/lib/notebook-styles";
import { EditNotebook } from "@/components/edit-notebook";
import { DeleteNotebook } from "@/components/delete-notebook";
import { NotebookEditor } from "@/components/notebook-editor";

export default async function NotebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ notebookId: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { notebookId } = await params;
  const { note: focusNoteId } = await searchParams;
  const notebook = await getNotebook(notebookId);
  if (!notebook) notFound();

  const notes = await getNotes(notebookId);
  const cover = coverStyle(notebook.coverColor);

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-center justify-between">
          <Link
            href="/app"
            className="font-sans text-sm text-accent underline underline-offset-2"
          >
            ← Back to shelf
          </Link>
          <div className="flex items-center gap-2">
            <EditNotebook notebook={notebook} />
            <DeleteNotebook id={notebook.id} />
          </div>
        </header>

        <div className="mt-6 mb-4 flex items-center gap-3">
          <span
            className="h-5 w-4 shrink-0 rounded-sm shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${cover.sheen}, ${cover.dark})`,
            }}
            aria-hidden
          />
          <h1 className="font-serif text-2xl text-foreground">
            {notebook.topic}
          </h1>
        </div>

        <NotebookEditor
          notebookId={notebook.id}
          coverColor={notebook.coverColor}
          pageColor={notebook.pageColor}
          fontStyle={notebook.fontStyle}
          initialNotes={notes}
          focusNoteId={focusNoteId}
        />
      </div>
    </main>
  );
}
