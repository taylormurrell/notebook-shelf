"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { deleteNotebook } from "@/lib/notebook-actions";

export function DeleteNotebook({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      // deleteNotebook redirects to /app on success.
      await deleteNotebook(id);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-200 bg-panel px-4 py-2 font-sans text-sm text-red-700 transition hover:bg-red-50"
      >
        Delete
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete notebook">
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl text-foreground">
            Delete this notebook?
          </h2>
          <p className="font-sans text-sm text-muted">
            This permanently removes the notebook and everything inside it. This
            can&apos;t be undone.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-full border border-border bg-panel px-4 py-2 font-sans text-sm text-foreground transition hover:bg-background disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={pending}
              className="rounded-full bg-red-700 px-5 py-2 font-sans text-sm text-white transition hover:bg-red-800 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete notebook"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
