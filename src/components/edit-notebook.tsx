"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { NotebookForm } from "@/components/notebook-form";
import type { Notebook } from "@/lib/notebooks";

export function EditNotebook({ notebook }: { notebook: Notebook }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border bg-panel px-4 py-2 font-sans text-sm text-foreground transition hover:bg-background"
      >
        Edit
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit notebook">
        <NotebookForm
          mode="edit"
          initial={{
            id: notebook.id,
            topic: notebook.topic,
            coverColor: notebook.coverColor,
            pageColor: notebook.pageColor,
            fontStyle: notebook.fontStyle,
          }}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
