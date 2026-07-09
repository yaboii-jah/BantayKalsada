"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateFeedbackNote } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Save, Trash2, Loader2 } from "lucide-react";

interface FeedbackNoteEditorProps {
  feedbackId: string;
  initialNote: string | null;
}

const MAX_LENGTH = 500;

export function FeedbackNoteEditor({
  feedbackId,
  initialNote,
}: FeedbackNoteEditorProps) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(initialNote ?? "");
  }, [initialNote]);

  const hasNote = initialNote !== null && initialNote.length > 0;
  const isDirty = note !== (initialNote ?? "");
  const canSave = note.trim().length > 0 && isDirty && !pending;

  const handleSave = () => {
    const trimmed = note.trim();
    if (trimmed.length === 0) return;
    if (trimmed === initialNote) return;

    startTransition(async () => {
      const result = await updateFeedbackNote(feedbackId, trimmed);
      if (result.success) {
        toast.success("Note saved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save note");
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await updateFeedbackNote(feedbackId, null);
      if (result.success) {
        toast.success("Note removed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to remove note");
      }
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Admin Note (internal — visible to citizen)
      </label>
      <textarea
        ref={textareaRef}
        className="w-full rounded-md border border-border bg-card p-3 text-sm text-foreground resize-none transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        rows={3}
        maxLength={MAX_LENGTH}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add an admin note..."
        disabled={pending}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {note.length}/{MAX_LENGTH}
        </span>
        <div className="flex items-center gap-2">
          {hasNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1 size-3.5" />
              )}
              Remove note
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            {pending ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 size-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
