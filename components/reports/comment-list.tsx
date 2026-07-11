"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CommentItem } from "./comment-item";
import { Loader2 } from "lucide-react";

interface CommentRecord {
  author_name: string;
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  status: string;
  user_id: string;
  parent_id: string | null;
  report_id: string;
}

interface CommentListProps {
  reportId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  refreshKey: number;
  optimisticComments: Record<string, unknown>[];
  onOptimisticConfirmed: (ids: string[]) => void;
}

export function CommentList({
  reportId,
  currentUserId,
  isAdmin,
  refreshKey,
  optimisticComments,
  onOptimisticConfirmed,
}: CommentListProps) {
  const [comments, setComments] = useState<CommentRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  const optimisticRef = useRef(optimisticComments);
  optimisticRef.current = optimisticComments;

  const confirmRef = useRef(onOptimisticConfirmed);
  confirmRef.current = onOptimisticConfirmed;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("report_comments")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (data) {
          setComments(data as unknown as CommentRecord[]);
          const fetchedIds = data.map((c) => c.id);
          confirmRef.current(
            optimisticRef.current
              .map((oc) => oc.id as string)
              .filter((id) => fetchedIds.includes(id)),
          );
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [reportId, refreshKey]);

  const allComments: CommentRecord[] = useMemo(() => {
    const fetched = comments ?? [];
    const optimistic = optimisticComments as unknown as CommentRecord[];
    const optimisticIds = new Set(optimistic.map((c) => c.id));
    return [...optimistic, ...fetched.filter((c) => !optimisticIds.has(c.id))]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, optimisticComments]);

  if (loading && allComments.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allComments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No comments yet. Be the first to share your thoughts.
      </p>
    );
  }

  const topLevel = allComments.filter((c) => !c.parent_id);
  const replies = allComments.filter((c) => c.parent_id);

  return (
    <div className="space-y-1">
      {topLevel.map((comment) => (
        <div key={comment.id}>
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            reportId={reportId}
          />
          {replies
            .filter((r) => r.parent_id === comment.id)
            .map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                reportId={reportId}
                depth={1}
              />
            ))}
        </div>
      ))}
    </div>
  );
}
