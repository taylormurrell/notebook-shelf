"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { NotebookForm } from "@/components/notebook-form";

// Opens the create-notebook form. Rendered either as a pill button (empty
// state) or as a dashed tile at the end of the shelf grid.
export function CreateNotebook({
  variant = "button",
}: {
  variant?: "button" | "tile";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "tile" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-panel/50 text-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="flex flex-col items-center gap-2">
            <span className="text-3xl leading-none">+</span>
            <span className="font-sans text-xs">New notebook</span>
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-sans text-sm text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="text-base leading-none">+</span> New notebook
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New notebook">
        <NotebookForm mode="create" onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
