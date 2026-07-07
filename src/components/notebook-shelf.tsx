import type { Notebook } from "@/lib/notebooks";
import { NotebookCard } from "@/components/notebook-card";
import { CreateNotebook } from "@/components/create-notebook";

// The forward-facing shelf: a responsive grid of notebook covers, with a
// trailing "new notebook" tile. Falls back to an empty state when the shelf
// has no notebooks yet.
export function NotebookShelf({ notebooks }: { notebooks: Notebook[] }) {
  if (notebooks.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-border bg-panel/60 p-14 text-center">
        <p className="font-serif text-lg text-foreground">
          Your shelf is empty
        </p>
        <p className="mx-auto mt-2 max-w-sm font-sans text-sm text-muted">
          Create your first notebook to start writing.
        </p>
        <div className="mt-6 flex justify-center">
          <CreateNotebook variant="button" />
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {notebooks.map((notebook) => (
        <NotebookCard key={notebook.id} notebook={notebook} />
      ))}
      <li className="flex">
        <CreateNotebook variant="tile" />
      </li>
    </ul>
  );
}
