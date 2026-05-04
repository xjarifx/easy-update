import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchUserPreferences,
  toUserPreferences,
  updateUserPreferences,
} from "../api/preferences";
import {
  type AppConfigType,
  DEFAULT_CONFIG,
  isValidConfig,
  FONT_STACKS,
} from "./appConfig";
import { getToken, isAuthenticated } from "../api/auth";

interface AppConfigContextType {
  config: AppConfigType;
  updateConfig: (newConfig: Partial<AppConfigType>) => void;
  resetConfig: () => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined,
);

function applyFontToDocument(fontStack: string): void {
  const root = document.documentElement;
  root.style.setProperty("--app-font-family", fontStack);
}

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfigType>(DEFAULT_CONFIG);

  const persistRemoteConfig = useCallback(
    async (nextConfig: AppConfigType) => {
      if (!isAuthenticated()) {
        return;
      }

      const token = getToken();

      if (!token) {
        return;
      }

      await updateUserPreferences(nextConfig, token).catch((error) => {
        console.warn("Failed to save app config to server:", error);
      });
    },
    [],
  );

  useEffect(() => {
    const fontStack = FONT_STACKS[config.font];
    applyFontToDocument(fontStack);
  }, [config.font]);

  useEffect(() => {
    if (!isAuthenticated()) {
      setConfig(DEFAULT_CONFIG);
      return;
    }

    let isMounted = true;

    const hydrateRemoteConfig = async () => {
      const token = getToken();

      if (!token) {
        return;
      }

      try {
        const remotePreferences = await fetchUserPreferences(token);
        const remoteConfig = toUserPreferences(remotePreferences);

        if (!isValidConfig(remoteConfig)) {
          return;
        }

        if (isMounted) {
          setConfig(remoteConfig);
        }
      } catch (error) {
        console.warn("Failed to load app config from server:", error);
      }
    };

    void hydrateRemoteConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AppConfigType>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      void persistRemoteConfig(updated);
      return updated;
    });
  }, [persistRemoteConfig]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    void persistRemoteConfig(DEFAULT_CONFIG);
  }, [persistRemoteConfig]);

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
