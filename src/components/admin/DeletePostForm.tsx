"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deletePost, type ActionState } from "@/app/admin/(dashboard)/posts/actions";

type Props = {
  id: string;
  slug: string;
};

const idle: ActionState = { status: "idle" };

/** Two steps: reveal the danger zone, then type the slug. Deleting removes both languages for good. */
export function DeletePostForm({ id, slug }: Props) {
  const [state, action, pending] = useActionState(deletePost, idle);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  if (!open) {
    return (
      <button type="button" className="admin-button-danger w-fit" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Delete this post…
      </button>
    );
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4 border-s-2 border-signal ps-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-ink">
        This permanently deletes the post in both languages, including published versions. It cannot be undone.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm-slug" className="text-sm font-semibold text-ink">
          Type <code className="font-mono text-signal-deep">{slug}</code> to confirm
        </label>
        <input
          id="confirm-slug"
          name="confirmSlug"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          className="admin-input font-mono"
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={state.status === "error" ? "delete-error" : undefined}
        />
      </div>
      {state.status === "error" ? (
        <p id="delete-error" role="alert" className="text-sm font-semibold text-signal-deep">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="admin-button-danger" disabled={pending || confirmation.trim() !== slug}>
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button type="button" className="admin-button" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
