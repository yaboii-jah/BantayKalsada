"use client";

import { useEffect, useState, useRef, useTransition, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bell,
  BellRing,
  CheckCircle,
  XCircle,
  CheckCheck,
  MessageCircle,
  MessageSquare,
  Check,
  Loader2,
  X,
  Flag,
  AlertTriangle,
} from "lucide-react";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/app/actions";
import { formatReportDate } from "@/lib/date-utils";
import type { Tables } from "@/types/database.types";

type Notification = Tables<"notifications">;

interface NotificationBellProps {
  userId: string;
}

const NOTIFICATION_ICONS: Record<
  Notification["type"],
  typeof CheckCircle
> = {
  COMMENT_ADDED: MessageCircle,
  REPORT_APPROVED: CheckCircle,
  REPORT_REJECTED: XCircle,
  REPORT_RESOLVED: CheckCheck,
  FEEDBACK_ACKNOWLEDGED: MessageSquare,
  FEEDBACK_CLOSED: Check,
  FEEDBACK_NOTE_ADDED: MessageSquare,
  REPORT_FLAGGED: Flag,
  OFFLINE_SUBMIT_FAILED: AlertTriangle,
};

function getNotificationHref(notification: Notification): string {
  if (notification.type === "COMMENT_ADDED" && notification.report_id) {
    return `/reports/${notification.report_id}`;
  }
  if (notification.type === "REPORT_FLAGGED" && notification.report_id) {
    return `/admin/reports/${notification.report_id}`;
  }
  if (notification.type.startsWith("FEEDBACK_") && notification.feedback_id) {
    return `/my-feedback/${notification.feedback_id}`;
  }
  if (notification.type === "OFFLINE_SUBMIT_FAILED") {
    return `/my-reports`;
  }
  return `/my-reports/${notification.report_id}`;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const instanceId = useId();
  const channelName = `notifications-realtime-${instanceId.replace(/[:]/g, "")}`;
  const menuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setFetching(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => {
        setUnreadCount(count ?? 0);
      });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications, channelName]);

  const handleToggle = useCallback(() => {
    if (!open && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchNotifications();
    }
    setOpen((p) => !p);
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleItemClick = useCallback(
    (notification: Notification) => {
      startTransition(async () => {
        if (!notification.is_read) {
          await markNotificationAsRead(notification.id);
          setUnreadCount((c) => Math.max(0, c - 1));
          setNotifications((prev) =>
            prev?.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n,
            ) ?? null,
          );
        }
        setOpen(false);
        router.push(getNotificationHref(notification));
      });
    },
    [router],
  );

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    await markAllNotificationsAsRead();
    setNotifications((prev) =>
      prev?.map((n) => ({ ...n, is_read: true })) ?? null,
    );
    setUnreadCount(0);
    setMarkingAll(false);
    setOpen(false);
  }, []);

  const handleDeleteNotification = useCallback(
    (notification: Notification, e: React.MouseEvent) => {
      e.stopPropagation();
      startTransition(async () => {
        await deleteNotification(notification.id);
        setNotifications((prev) =>
          prev?.filter((n) => n.id !== notification.id) ?? null,
        );
        if (!notification.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      });
    },
    [],
  );

  const handleClearAll = useCallback(async () => {
    await clearAllNotifications();
    setNotifications(null);
    setUnreadCount(0);
    setOpen(false);
  }, []);

  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
        aria-label="Notifications"
        aria-expanded={open}
      >
        {hasUnread ? (
          <BellRing className="size-5" />
        ) : (
          <Bell className="size-5" />
        )}
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-tight text-white">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 sm:w-96">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {notifications && notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {hasUnread && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
                  >
                    {markingAll ? "Marking..." : "Mark all as read"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {fetching ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type];
                const unread = !notification.is_read;
                return (
                  <div
                    key={notification.id}
                    className={`group relative flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent ${
                      unread
                        ? "border-l-2 border-l-primary bg-muted/50 font-medium"
                        : "border-l-2 border-l-transparent text-muted-foreground"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleItemClick(notification)}
                      disabled={isPending}
                      className="flex flex-1 items-start gap-3 text-left disabled:opacity-50"
                    >
                      <Icon
                        className={`mt-0.5 size-4 shrink-0 ${
                          notification.type === "REPORT_APPROVED"
                            ? "text-status-approved"
                            : notification.type === "REPORT_REJECTED"
                              ? "text-status-rejected"
                              : notification.type === "REPORT_FLAGGED"
                                ? "text-yellow-500"
                              : notification.type === "FEEDBACK_ACKNOWLEDGED"
                                ? "text-status-approved"
                            : notification.type === "FEEDBACK_CLOSED"
                              ? "text-status-resolved"
                              : notification.type === "FEEDBACK_NOTE_ADDED"
                                ? "text-status-approved"
                              : notification.type === "OFFLINE_SUBMIT_FAILED"
                                ? "text-status-rejected"
                                : "text-primary"
                        }`}
                      />
                      <div className="flex-1 space-y-0.5">
                        <p
                          className={`text-xs leading-snug ${
                            unread ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          {formatReportDate(notification.created_at)}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(notification, e)}
                      className="absolute right-2 top-2 flex size-5 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Delete notification"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <CheckCheck className="size-8" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
