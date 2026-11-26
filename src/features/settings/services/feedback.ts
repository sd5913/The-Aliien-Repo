import { supabase } from "../../../lib/supabase/client";
import type { Locale } from "../../../i18n/locale";
import packageJson from "../../../../package.json";

export const FEEDBACK_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadFeedbackScreenshot(file: File): Promise<string> {
  if (!FEEDBACK_IMAGE_TYPES.includes(file.type) || file.size > FEEDBACK_IMAGE_MAX_BYTES) {
    throw new Error("Invalid feedback screenshot");
  }
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${crypto.randomUUID()}/screenshot.${extension}`;
  const { error } = await supabase.storage.from("feedback-screenshots").upload(path, file, {
    upsert: false, contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function submitFeedback(input: {
  title: string; body: string; contact: string; locale: Locale; screenshotPath: string | null;
}): Promise<void> {
  const { error } = await supabase.from("user_feedback").insert({
    title: input.title.trim(), body: input.body.trim(),
    contact: input.contact.trim() || null, screenshot_path: input.screenshotPath,
    locale: input.locale, app_version: packageJson.version,
  });
  // Do not request a representation: feedback and contact details are write-only for clients.
  if (error) throw error;
}
