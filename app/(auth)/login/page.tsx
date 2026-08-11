"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { useAnalytics } from "@/lib/analytics";

function LoginForm() {
  const router = useRouter();
  const track = useAnalytics();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/browse";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      if (!email || !password) {
        setError("Email and password are required.");
        return;
      }

      setLoading(true);

      const supabase = createSupabaseBrowserClient();
      const { error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      setLoading(false);

      if (signInError) {
        if (signInError.message === "Invalid login credentials") {
          setError("Invalid email or password.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push(redirect);
      router.refresh();
      track("Login");
    },
    [email, password, redirect, router, track],
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back to Bantay Kalsada.
        </p>
      </div>

      <GoogleSignIn redirect={redirect} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>         

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/reset-password"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>

      <div className="mt-8 block sm:hidden">
        <div className="rounded-lg bg-muted px-4 py-3 text-center text-xs text-muted-foreground">
          Bantay Kalsada — Report road hazards in your community.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
