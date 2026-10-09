"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign, Loader2, UserRound } from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { saveProfile } from "@/lib/auth/client";
import { safeNextPath } from "@/lib/auth/redirect";
import { needsProfile, SKIP_KEY } from "@/lib/auth/profileState";
import { validateProfile } from "@/lib/auth/profileValidation";
import { AUTH_LIMITS, INTEREST_OPTIONS } from "@/lib/auth/validation";

import AuthShell from "./AuthShell";
import Field from "./Field";
import InterestPicker from "./InterestPicker";

const FIELD_IDS = { name: "profile-name", username: "profile-username", interests: "signup-interests" };
const focusFirstError = (fields) => {
  const first = ["name", "username", "interests"].find((name) => fields[name]);
  if (first) requestAnimationFrame(() => document.getElementById(FIELD_IDS[first])?.focus());
};

function Spinner() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading your profile">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </main>
  );
}

function ProfileFields({ initial, next }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const usernameCheck = useUsernameCheck(form.username);

  const set = (name) => (value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    const { values, fields } = validateProfile(form);
    if (!fields.username && usernameCheck.status === "taken") fields.username = usernameCheck.message || "That username is already taken.";
    setErrors(fields);
    if (Object.keys(fields).length > 0) return focusFirstError(fields);

    setSubmitting(true);
    try {
      await saveProfile(values);
      router.replace(next); // the profile listener also updates, so the gate lets them straight through
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields);
        focusFirstError(error.fields);
      } else {
        setFormError(error.message);
      }
      setSubmitting(false);
    }
  }

  function skip() {
    try {
      sessionStorage.setItem(SKIP_KEY, "1");
    } catch {} // private mode: they'll simply be asked again
    router.replace(next);
  }

  async function signOut() {
    await logout();
    router.replace("/login");
  }

  const { status, message } = usernameCheck;
  const usernameError = errors.username || (status === "taken" ? message || "That username is already taken." : "");
  const usernameHint =
    status === "checking" ? "Checking availability…"
    : status === "available" ? `@${usernameCheck.value} is available`
    : status === "invalid" ? message
    : `${AUTH_LIMITS.username.min}–${AUTH_LIMITS.username.max} letters, numbers or underscores. You can't change it later.`;

  return (
    <AuthShell
      title="Complete your profile"
      subtitle="Two quick things so Prava AI can personalise your trips"
      brandTitle="Almost there!"
      brandText="Pick a username and tell us what you love. It takes under a minute."
      footer={
        <p className="text-muted-foreground">
          Not you?{" "}
          <button type="button" onClick={signOut} className="cursor-pointer font-medium text-primary hover:underline">
            Sign out
          </button>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {formError}
          </div>
        )}

        <Field
          id="profile-name"
          label="Full name"
          icon={UserRound}
          autoComplete="name"
          autoFocus
          placeholder="Ana Rao"
          value={form.name}
          onChange={(e) => set("name")(e.target.value)}
          error={errors.name}
          maxLength={AUTH_LIMITS.name.max + 10}
          disabled={submitting}
        />

        <Field
          id="profile-username"
          label="Username"
          icon={AtSign}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ana_rao"
          value={form.username}
          onChange={(e) => set("username")(e.target.value)}
          error={usernameError}
          hint={usernameHint}
          hintTone={status === "available" ? "success" : undefined}
          maxLength={AUTH_LIMITS.username.max + 5}
          disabled={submitting}
        />

        <InterestPicker value={form.interests} onChange={set("interests")} error={errors.interests} />

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Saving…" : "Continue"}
        </Button>
        <button type="button" onClick={skip} disabled={submitting} className="mx-auto block cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
          Skip for now
        </button>
      </form>
    </AuthShell>
  );
}

export default function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { status, profile } = useProfile(user?.uid);

  const rawNext = searchParams.get("next");
  const next = safeNextPath(rawNext);

  const complete = status === "ready" && !needsProfile(profile);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/onboarding${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`)}`);
    else if (complete) router.replace(next); // nothing left to fill in
  }, [loading, user, complete, next, rawNext, router]);

  // "missing" = the profile doc is still being created right after sign-in.
  if (loading || !user || status === "loading" || status === "missing" || complete) return <Spinner />;

  // status "error" still shows the form: the server can create what's missing.
  const initial = {
    name: profile?.name || user.displayName || "",
    username: "",
    interests: Array.isArray(profile?.preferences) ? profile.preferences.filter((p) => INTEREST_OPTIONS.includes(p)) : [],
  };
  return <ProfileFields initial={initial} next={next} />;
}
