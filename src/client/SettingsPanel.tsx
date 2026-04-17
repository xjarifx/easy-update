import { useAppConfig } from "./config/AppConfigContext";
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
        <h1 className="neo-label mb-1 text-2xl">App Configuration</h1>
        <p className="mb-6 text-sm text-gray-500">
          Customize the look and feel of your app
        </p>
      </div>

      {/* Date Format */}
      <div className="neo-card p-4">
        <label className="neo-label mb-2 block">Date Format</label>
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
        <label className="neo-label mb-2 block">Time Format</label>
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
        <label className="neo-label mb-2 block">Font</label>
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
        <label className="neo-label mb-2 block">First Day of Week</label>
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
        className="calendar-toolbar-match-button w-full px-4 py-2"
      >
        Reset to Defaults
      </button>

      {/* Info Box */}
      <div className="neo-card border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> These settings will be applied across the
          entire app and saved to your browser's local storage. They will
          persist even after you close the app.
        </p>
      </div>
    </div>
  );
}
