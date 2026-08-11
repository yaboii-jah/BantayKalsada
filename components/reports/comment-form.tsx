"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { addComment, editComment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAnalytics } from "@/lib/analytics";

interface CommentFormProps {
  reportId: string;
  parentId?: string | null;
  editCommentId?: string;
  initialBody?: string;
  onCancel?: () => void;
  onDone?: (data?: Record<string, unknown>) => void;
  placeholder?: string;
}

export function CommentForm({
  reportId,
  parentId,
  editCommentId,
  initialBody = "",
  onCancel,
  onDone,
  placeholder = "Write a comment...",
}: CommentFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const track = useAnalytics();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [body]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!body.trim()) return;

    startTransition(async () => {
      if (editCommentId) {
        const result = await editComment(null, {
          comment_id: editCommentId,
          body: body.trim(),
        });
        if (result.success) {
          setBody("");
          onDone?.();
        } else {
          setError(result.error ?? "Failed to edit comment");
        }
      } else {
        const result = await addComment(null, {
          report_id: reportId,
          parent_id: parentId ?? null,
          body: body.trim(),
        });
        if (result.success) {
          setBody("");
          track("Comment Added");
          onDone?.(result.data as Record<string, unknown> | undefined);
        } else {
          setError(result.error ?? "Failed to post comment");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={2000}
        aria-label="Write a comment"
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/60">
          {body.length}/2000
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {editCommentId ? "Save" : "Post"}
          </Button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-status-rejected">{error}</p>
      )}
    </form>
  );
}
