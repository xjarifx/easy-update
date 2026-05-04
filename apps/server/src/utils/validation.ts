import { z } from "zod";

export const noticeMutationSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  title: z.string().min(1, "Title is required"),
  moreInfo: z.string().default(""),
  completed: z.boolean().default(false),
});

export const userPreferencesMutationSchema = z.object({
  dateFormat: z.enum(["DD-MMM-YYYY", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "MMM DD, YYYY", "DD MMM"]).optional(),
  timeFormat: z.enum(["hh:mm AM/PM", "HH:mm"]).optional(),
  font: z.enum(["Inter", "SF Pro", "System", "Georgia", "Helvetica"]).optional(),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional(),
});

export const providerModelsSchema = z.object({
  provider: z.enum(["openrouter", "openai", "anthropic", "google"]),
});

export const eventExtractionSchema = z.object({
  text: z.string().min(1, "Text is required").optional(),
  inputText: z.string().min(1, "Text is required").optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  provider: z.enum(["openrouter", "openai", "anthropic", "google"]).optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  start: z.string().min(1, "Start date/time is required"),
  moreInfo: z.string().default(""),
});

export type ValidatedNoticeInput = z.infer<typeof noticeMutationSchema>;
export type ValidatedPreferencesInput = z.infer<typeof userPreferencesMutationSchema>;
export type ValidatedProviderModelsInput = z.infer<typeof providerModelsSchema>;
export type ValidatedEventExtractionInput = z.infer<typeof eventExtractionSchema>;
export type ValidatedCalendarEventInput = z.infer<typeof calendarEventSchema>;
