"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 60;

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendReset = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      if (!email) {
        setError("Please enter your email address.");
        return;
      }

      setLoading(true);

      const supabase = createSupabaseBrowserClient();
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      setLoading(false);

      if (resetError) {
        if (
          resetError.message.toLowerCase().includes("rate") ||
          resetError.message.toLowerCase().includes("too many") ||
          resetError.message.toLowerCase().includes("security")
        ) {
          setError("Too many requests. Please wait a minute and try again.");
        } else {
          setError(resetError.message);
        }
        return;
      }

      setSent(true);
      startCooldown();
    },
    [email, startCooldown],
  );

  const handleUpdatePassword = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      setLoading(true);

      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      setLoading(false);

      if (updateError) {
        if (
          updateError.message.toLowerCase().includes("same password")
        ) {
          setError("New password must be different from your current password.");
        } else {
          setError(updateError.message);
        }
        return;
      }

      window.location.href = "/browse";
    },
    [password],
  );

  if (hasToken) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">
            Set new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a new password for your account.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating password…" : "Update password"}
          </Button>
        </form>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account with <strong>{email}</strong> exists, we&apos;ve sent a
          password reset link.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          disabled={cooldown > 0}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Send again"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSendReset} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Sign in
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
