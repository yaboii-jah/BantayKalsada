"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatReportDate } from "@/lib/date-utils";
import { deleteComment } from "@/app/actions";
import { removeComment } from "@/app/admin/actions";
import { MoreHorizontal, Pencil, Trash2, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentForm } from "./comment-form";

interface CommentItemProps {
  comment: {
    author_name: string;
    id: string;
    body: string;
    created_at: string;
    updated_at: string;
    status: string;
    user_id: string;
    parent_id: string | null;
  };
  currentUserId: string | null;
  isAdmin: boolean;
  reportId: string;
  depth?: number;
}

export function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  reportId,
  depth = 0,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [locallyRemoved, setLocallyRemoved] = useState(false);
  const [locallyDeleted, setLocallyDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOwn = currentUserId === comment.user_id;
  const isRemoved = comment.status === "REMOVED" || locallyRemoved;
  const initials = (comment.author_name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isRemoved) {
    return (
      <div
        className={`rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 px-4 py-3 ${depth > 0 ? "ml-8" : ""}`}
      >
        <p className="text-xs italic text-muted-foreground">
          This comment has been removed by a moderator.
        </p>
      </div>
    );
  }

  if (locallyDeleted) return null;

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result.success) {
        setLocallyDeleted(true);
      } else if (result.error) {
        console.error(result.error);
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeComment(comment.id);
      if (result.success) {
        setLocallyRemoved(true);
      } else if (result.error) {
        console.error(result.error);
      }
    });
  };

  return (
    <div className={`group ${depth > 0 ? "ml-8" : ""}`}>
      <div className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/30">
        <Avatar size="sm" className="mt-0.5">
          <AvatarFallback>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {comment.author_name || "Anonymous"}
            </span>
            <span className="text-[11px] text-muted-foreground/60">
              {formatReportDate(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-[11px] text-muted-foreground/40">(edited)</span>
            )}
          </div>

          {editing ? (
            <CommentForm
              reportId={reportId}
              parentId={comment.parent_id}
              editCommentId={comment.id}
              initialBody={comment.body}
              onCancel={() => setEditing(false)}
              onDone={() => setEditing(false)}
            />
          ) : (
            <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">
              {comment.body}
            </p>
          )}
        </div>

        {(isOwn || isAdmin) && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              {isOwn && (
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 size-3.5" />
                  Edit
                </DropdownMenuItem>
              )}
              {isOwn && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-status-rejected"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </DropdownMenuItem>
              )}
              {isAdmin && !isOwn && (
                <DropdownMenuItem
                  onClick={handleRemove}
                  className="text-status-rejected"
                >
                  <ShieldAlert className="mr-2 size-3.5" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
