"use client";

import { useState, useCallback } from "react";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { MessageCircle } from "lucide-react";

interface CommentSectionProps {
  reportId: string;
  currentUserId: string | null;
  isAdmin: boolean;
}

export function CommentSection({
  reportId,
  currentUserId,
  isAdmin,
}: CommentSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [optimisticComments, setOptimisticComments] = useState<Record<string, unknown>[]>([]);

  const handleCommentAdded = useCallback((result?: Record<string, unknown>) => {
    if (result) {
      setOptimisticComments((prev) => [...prev, result]);
    }
    setRefreshKey((k) => k + 1);
  }, []);

  const clearOptimistic = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setOptimisticComments((prev) => prev.filter((c) => !ids.includes(c.id as string)));
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <MessageCircle className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Comments</h2>
      </div>

      <div className="px-5 py-4">
        {currentUserId ? (
          <div className="mb-6">
            <CommentForm
              reportId={reportId}
              onDone={handleCommentAdded}
            />
          </div>
        ) : (
          <div className="mb-6 rounded-lg bg-muted/50 px-4 py-3 text-center text-xs text-muted-foreground">
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>{" "}
            to leave a comment.
          </div>
        )}

        <CommentList
          reportId={reportId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          refreshKey={refreshKey}
          optimisticComments={optimisticComments}
          onOptimisticConfirmed={clearOptimistic}
        />
      </div>
    </div>
  );
}
