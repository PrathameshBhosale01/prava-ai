"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { AtSign, Loader2, Mail, UserRound } from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { registerAccount } from "@/lib/auth/client";
import { friendlyAuthError } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/redirect";
import { AUTH_LIMITS, validateSignup } from "@/lib/auth/validation";
import { auth } from "@/lib/firebase";

import AuthShell from "./AuthShell";
import Field from "./Field";
import GoogleButton, { OrDivider } from "./GoogleButton";
import InterestPicker from "./InterestPicker";
import PasswordField from "./PasswordField";

// Top-to-bottom order of the form: which invalid field gets focus first.
const FIELD_ORDER = ["email", "password", "name", "username", "interests"];
const FIELD_IDS = { email: "signup-email", password: "signup-password", name: "signup-name", username: "signup-username", interests: "signup-interests" };
const focusFirstError = (fields) => {
  const first = FIELD_ORDER.find((name) => fields[name]);
  if (first) requestAnimationFrame(() => document.getElementById(FIELD_IDS[first])?.focus());
};

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const rawNext = searchParams.get("next");
  const next = safeNextPath(rawNext);
  const withNext = (path) => (rawNext && next !== "/dashboard" ? `${path}?next=${encodeURIComponent(next)}` : path);

  const [form, setForm] = useState({ email: "", password: "", name: "", username: "", interests: [] });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const usernameCheck = useUsernameCheck(form.username);
  const busy = submitting || googleLoading;

  useEffect(() => {
    if (!loading && user && !accountCreated) router.replace(next);
  }, [loading, user, accountCreated, next, router]);

  const set = (name) => (value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };
  const onText = (name) => (e) => set(name)(e.target.value);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setFormError("");

    const { values, fields } = validateSignup(form);
    if (!fields.username && usernameCheck.status === "taken") fields.username = usernameCheck.message || "That username is already taken.";
    setErrors(fields);
    if (Object.keys(fields).length > 0) return focusFirstError(fields);

    setSubmitting(true);
    try {
      await registerAccount(values);
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields);
        focusFirstError(error.fields);
      } else {
        setFormError(error.message);
      }
      setSubmitting(false);
      return;
    }

    // The account exists now. Signing in is a separate step, so a failure here must not
    // tell the person their signup failed (retrying would hit "email already exists").
    setAccountCreated(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.replace(next);
    } catch {
      setFormError("Your account was created, but we couldn't sign you in automatically. Please sign in below.");
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    if (busy) return;
    setFormError("");
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace(next);
    } catch (error) {
      const message = friendlyAuthError(error?.code);
      if (message) setFormError(message);
      setGoogleLoading(false);
    }
  }

  if (loading || (user && !accountCreated)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking your session">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </main>
    );
  }

  // Username message: format problems are a gentle hint while typing (not an angry error);
  // "taken" and submit-time problems are real errors.
  const { status, message } = usernameCheck;
  const usernameError = errors.username || (status === "taken" ? message || "That username is already taken." : "");
  const usernameHint =
    status === "checking" ? "Checking availability…"
    : status === "available" ? `@${usernameCheck.value} is available`
    : status === "invalid" ? message
    : `${AUTH_LIMITS.username.min}–${AUTH_LIMITS.username.max} letters, numbers or underscores`;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Fill in your details to get started"
      brandTitle="Join Prava AI"
      brandText="Let's get you started on an amazing journey."
      footer={
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link href={withNext("/login")} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {formError}{" "}
            {accountCreated && (
              <Link href={withNext("/login")} className="font-medium underline">
                Go to sign in
              </Link>
            )}
          </div>
        )}

        <Field
          id="signup-email"
          label="Email address"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          value={form.email}
          onChange={onText("email")}
          error={errors.email}
          disabled={busy}
        />

        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={form.password}
          onChange={onText("password")}
          error={errors.password}
          hint={`At least ${AUTH_LIMITS.password.min} characters, with a letter and a number`}
          showStrength
          disabled={busy}
        />

        <Field
          id="signup-name"
          label="Full name"
          icon={UserRound}
          autoComplete="name"
          placeholder="Ana Rao"
          value={form.name}
          onChange={onText("name")}
          error={errors.name}
          maxLength={AUTH_LIMITS.name.max + 10}
          disabled={busy}
        />

        <Field
          id="signup-username"
          label="Username"
          icon={AtSign}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ana_rao"
          value={form.username}
          onChange={onText("username")}
          error={usernameError}
          hint={usernameHint}
          hintTone={status === "available" ? "success" : undefined}
          maxLength={AUTH_LIMITS.username.max + 5}
          disabled={busy}
        />

        <InterestPicker value={form.interests} onChange={set("interests")} error={errors.interests} />

        <Button type="submit" size="lg" className="w-full" disabled={busy || accountCreated}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? (accountCreated ? "Signing you in…" : "Creating account…") : "Create account"}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton onClick={onGoogle} loading={googleLoading} disabled={submitting} />
    </AuthShell>
  );
}
