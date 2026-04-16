import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from "react";

type BoundaryProps = {
  children: ReactNode;
};

type BoundaryState = {
  hasError: boolean;
  message: string;
};

class GlobalErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {
    hasError: false,
    message: "Something went wrong in the app.",
  };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong in the app.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Frontend render error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 p-6">
          <section className="mx-auto max-w-2xl border border-rose-300 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-rose-700">
              Application Error
            </h1>
            <p className="mt-2 text-sm text-slate-700">{this.state.message}</p>
            <button
              className="mt-5 border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload Application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function getRuntimeMessage(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string" && reason.trim()) {
    return reason;
  }

  return "An unexpected runtime error occurred.";
}

export function GlobalErrorShell({ children }: BoundaryProps) {
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setRuntimeMessage(getRuntimeMessage(event.error ?? event.message));
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      setRuntimeMessage(getRuntimeMessage(event.reason));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <>
      {runtimeMessage ? (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-rose-300 bg-rose-50 px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
            <p className="text-sm text-rose-800">{runtimeMessage}</p>
            <button
              className="shrink-0 border border-rose-300 px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
              onClick={() => setRuntimeMessage(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
    </>
  );
}
