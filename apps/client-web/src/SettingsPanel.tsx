import { useAppConfig } from "./config/AppConfigContext";
import {
  CalendarDays,
  CalendarRange,
  Clock3,
  Info,
  RotateCcw,
  Type,
} from "lucide-react";
import {
  getDateFormatOptions,
  getTimeFormatOptions,
  getFontOptions,
  getFirstDayOfWeekOptions,
} from "./config/appConfig";

export function SettingsPanel() {
  const { config, updateConfig, resetConfig } = useAppConfig();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="neo-label mb-1 flex items-center gap-2 text-2xl">
          <CalendarDays className="h-6 w-6" aria-hidden="true" />
          App Configuration
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Choose how dates, times, and typography are displayed across the app.
        </p>
      </div>

      {/* Date Format */}
      <div className="neo-card p-4">
        <label className="neo-label mb-2 flex items-center gap-2">
          <CalendarRange className="h-4 w-4" aria-hidden="true" />
          Date Format
        </label>
        <select
          value={config.dateFormat}
          onChange={(e) => updateConfig({ dateFormat: e.target.value as any })}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {getDateFormatOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Time Format */}
      <div className="neo-card p-4">
        <label className="neo-label mb-2 flex items-center gap-2">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          Time Format
        </label>
        <select
          value={config.timeFormat}
          onChange={(e) => updateConfig({ timeFormat: e.target.value as any })}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {getTimeFormatOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font */}
      <div className="neo-card p-4">
        <label className="neo-label mb-2 flex items-center gap-2">
          <Type className="h-4 w-4" aria-hidden="true" />
          Font
        </label>
        <select
          value={config.font}
          onChange={(e) => updateConfig({ font: e.target.value as any })}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {getFontOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* First Day of Week */}
      <div className="neo-card p-4">
        <label className="neo-label mb-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          First Day of Week
        </label>
        <select
          value={config.firstDayOfWeek}
          onChange={(e) =>
            updateConfig({
              firstDayOfWeek: Number(
                e.target.value,
              ) as typeof config.firstDayOfWeek,
            })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {getFirstDayOfWeekOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetConfig}
        className="calendar-toolbar-match-button inline-flex w-full items-center justify-center gap-2 px-4 py-2"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reset to Defaults
      </button>

      {/* Info Box */}
      <div className="neo-card border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <Info
            className="mr-1 inline h-4 w-4 align-text-bottom"
            aria-hidden="true"
          />
          <strong>Note:</strong> Changes apply immediately to all pages and are
          saved in your browser, so they stay after refresh or restart.
        </p>
      </div>
    </div>
  );
}
