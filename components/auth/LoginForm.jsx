"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { friendlyAuthError } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/redirect";
import { validateEmail, validateLogin } from "@/lib/auth/validation";
import { auth } from "@/lib/firebase";

import AuthShell from "./AuthShell";
import Field from "./Field";
import GoogleButton, { OrDivider } from "./GoogleButton";
import PasswordField from "./PasswordField";

const focusField = (id) => requestAnimationFrame(() => document.getElementById(id)?.focus());

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // Where to go afterwards. Validated: an attacker-supplied ?next=https://evil.com must not work.
  const rawNext = searchParams.get("next");
  const next = safeNextPath(rawNext);
  const withNext = (path) => (rawNext && next !== "/dashboard" ? `${path}?next=${encodeURIComponent(next)}` : path);

  const [mode, setMode] = useState("signin"); // "signin" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSentTo, setResetSentTo] = useState("");

  // Already signed in (or just became signed in) → straight to the destination.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const busy = submitting || googleLoading;

  function showAuthError(error) {
    const code = error?.code;
    const message = friendlyAuthError(code);
    if (message === null) return; // e.g. they closed the Google window — not an error
    if (code === "auth/invalid-email") {
      setErrors({ email: message });
      focusField("login-email");
    } else {
      setFormError(message);
    }
  }

  async function onSignIn(e) {
    e.preventDefault();
    if (busy) return;
    setFormError("");

    const { values, fields } = validateLogin({ email, password });
    setErrors(fields);
    if (fields.email || fields.password) return focusField(fields.email ? "login-email" : "login-password");

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.replace(next);
    } catch (error) {
      showAuthError(error);
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    if (busy) return;
    setFormError("");
    setErrors({});
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace(next);
    } catch (error) {
      showAuthError(error);
      setGoogleLoading(false);
    }
  }

  async function onReset(e) {
    e.preventDefault();
    if (busy) return;
    setFormError("");

    const check = validateEmail(email);
    if (check.error) {
      setErrors({ email: check.error });
      return focusField("login-email");
    }
    setErrors({});

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, check.value);
      setResetSentTo(check.value);
    } catch (error) {
      // An unknown email looks exactly like success, so this form can't be used to find out who has an account.
      if (error?.code === "auth/user-not-found") setResetSentTo(check.value);
      else showAuthError(error);
    }
    setSubmitting(false);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    setFormError("");
    setResetSentTo("");
  }

  // Avoid flashing the form at someone who is already signed in.
  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking your session">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </main>
    );
  }

  const errorBox = formError && (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {formError}
    </div>
  );

  if (mode === "reset") {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to choose a new one."
        brandTitle="No worries!"
        brandText="It happens to everyone. We'll get you back to your trips in a minute."
        footer={
          <button type="button" onClick={() => switchMode("signin")} className="cursor-pointer font-medium text-primary hover:underline">
            ← Back to sign in
          </button>
        }
      >
        {resetSentTo ? (
          <div role="status" className="space-y-3 rounded-xl border border-success/30 bg-success-soft p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
            <p className="text-sm text-foreground">
              If an account exists for <strong className="break-all">{resetSentTo}</strong>, we&apos;ve sent a link to reset your password.
            </p>
            <p className="text-xs text-muted-foreground">Check your spam folder if it doesn&apos;t arrive in a few minutes.</p>
          </div>
        ) : (
          <form onSubmit={onReset} noValidate className="space-y-4">
            {errorBox}
            <Field
              id="login-email"
              label="Email address"
              icon={Mail}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={submitting}
            />
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter your credentials to access your account"
      brandTitle="Welcome back!"
      brandText="We've missed you. Sign in to pick up your trips right where you left off."
      footer={
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={withNext("/signup")} className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={onSignIn} noValidate className="space-y-4">
        {errorBox}

        <Field
          id="login-email"
          label="Email address"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
          }}
          error={errors.email}
          disabled={busy}
        />

        <div className="space-y-1.5">
          <PasswordField
            id="login-password"
            label="Password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
            }}
            error={errors.password}
            disabled={busy}
          />
          <div className="text-right">
            <button type="button" onClick={() => switchMode("reset")} className="cursor-pointer text-xs font-medium text-primary hover:underline">
              Forgot password?
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton onClick={onGoogle} loading={googleLoading} disabled={submitting} />
    </AuthShell>
  );
}
