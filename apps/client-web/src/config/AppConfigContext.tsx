import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type AppConfigType,
  DEFAULT_CONFIG,
  APP_CONFIG_STORAGE_KEY,
  isValidConfig,
  FONT_STACKS,
} from "./appConfig";

interface AppConfigContextType {
  config: AppConfigType;
  updateConfig: (newConfig: Partial<AppConfigType>) => void;
  resetConfig: () => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined,
);

/**
 * Load config from localStorage or use defaults
 */
function loadConfig(): AppConfigType {
  try {
    const stored = window.localStorage.getItem(APP_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidConfig(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load app config from storage:", error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save config to localStorage
 */
function saveConfig(config: AppConfigType): void {
  try {
    window.localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("Failed to save app config to storage:", error);
  }
}

/**
 * Apply font to document
 */
function applyFontToDocument(fontStack: string): void {
  const root = document.documentElement;
  root.style.setProperty("--app-font-family", fontStack);
}

/**
 * Provider component
 */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfigType>(loadConfig());

  // Apply font on config change
  useEffect(() => {
    const fontStack = FONT_STACKS[config.font];
    applyFontToDocument(fontStack);
  }, [config.font]);

  const updateConfig = useCallback((newConfig: Partial<AppConfigType>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      saveConfig(updated);
      return updated;
    });
  }, []);

  const resetConfig = useCallback(() => {
    saveConfig(DEFAULT_CONFIG);
    setConfig(DEFAULT_CONFIG);
  }, []);

  return (
    <AppConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

/**
 * Hook to use app config
 * Must be used inside AppConfigProvider
 */
export function useAppConfig(): AppConfigContextType {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error("useAppConfig must be used within AppConfigProvider");
  }
  return context;
}

/**
 * Hook to use only the config object (read-only)
 * Useful for components that only need to read config
 */
export function useAppConfigSettings(): AppConfigType {
  return useAppConfig().config;
}

/**
 * Hook to update config
 */
export function useAppConfigUpdate() {
  return useAppConfig().updateConfig;
}
