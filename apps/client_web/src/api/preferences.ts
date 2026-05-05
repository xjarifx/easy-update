import type {
  UserPreferences,
  UserPreferencesMutationInput,
  UserPreferencesRecord,
} from "@easy-update/types";
import { apiRequest } from "./http";

export const fetchUserPreferences = (token: string | null | undefined) => {
  return apiRequest<UserPreferencesRecord>("/api/preferences", {
    cache: "no-store",
    requiresAuth: true,
    token,
  });
};

export const updateUserPreferences = (
  preferences: UserPreferencesMutationInput,
  token: string | null | undefined,
) => {
  return apiRequest<UserPreferencesRecord>("/api/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferences),
    requiresAuth: true,
    token,
  });
};

export const toUserPreferences = (
  preferences: UserPreferencesRecord,
): UserPreferences => ({
  dateFormat: preferences.dateFormat,
  timeFormat: preferences.timeFormat,
  font: preferences.font,
  firstDayOfWeek: preferences.firstDayOfWeek,
});
