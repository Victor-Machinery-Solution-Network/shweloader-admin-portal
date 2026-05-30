/** Matches the app_feedback table in D1 */
export interface AppFeedback {
  id: number;
  app_user_id: number | null;
  message: string;
  platform: "ios" | "android" | null;
  app_version: string | null;
  created_at: string;
}

/**
 * Feedback row with the JOINed submitting user's contact fields.
 * All user fields are null for anonymous feedback (app_user_id IS NULL).
 */
export interface AppFeedbackWithUser extends AppFeedback {
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
}
