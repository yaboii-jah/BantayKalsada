-- Migration: Add DELETE policy on notifications for authenticated users
-- This allows switching deleteNotification and clearAllNotifications
-- from the service role client to the regular anon-key client.

CREATE POLICY "Citizens can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
