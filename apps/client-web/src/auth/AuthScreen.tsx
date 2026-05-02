import { SignIn } from "@clerk/clerk-react";

export function AuthScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn routing="hash" />
    </div>
  );
}
