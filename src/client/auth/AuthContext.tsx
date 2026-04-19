import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, signIn, signUp } from "../api/auth";
import { clearAuthToken, setAuthToken } from "../api/http";
import type { AuthResponse, AuthUser } from "../types/auth";

const AUTH_TOKEN_STORAGE_KEY = "easy-update.auth.token.v1";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  signInWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<AuthUser>;
  signUpWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<AuthUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const persistSession = (payload: AuthResponse) => {
  setAuthToken(payload.token);
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const signOut = useCallback(() => {
    setUser(null);
    clearAuthToken();
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }, []);

  const signInWithEmail = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await signIn(input);
      persistSession(response);
      setUser(response.user);

      return response.user;
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await signUp(input);
      persistSession(response);
      setUser(response.user);

      return response.user;
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

      if (!token) {
        if (isMounted) {
          setIsInitializing(false);
        }

        return;
      }

      setAuthToken(token);

      try {
        const me = await fetchCurrentUser();

        if (isMounted) {
          setUser(me);
        }
      } catch {
        if (isMounted) {
          signOut();
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [isInitializing, signInWithEmail, signOut, signUpWithEmail, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
