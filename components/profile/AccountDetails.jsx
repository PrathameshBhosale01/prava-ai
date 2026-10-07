"use client";

import { useId, useState } from "react";
import { CalendarDays, Loader2, Mail, Pencil, User } from "lucide-react";
import { toast } from "sonner";

import ProfileSection from "@/components/profile/ProfileSection";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { formatLongDate, getMemberSinceDate } from "@/lib/profileFormat";
import { getDisplayNameError, normalizeDisplayName } from "@/lib/profileValidation";

function DetailRow({ icon: Icon, label, action, children }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{children}</dd>
      </div>
      {action}
    </div>
  );
}

function DisplayNameEditor({ currentName, onCancel, onSave }) {
  const inputId = useId();
  const errorId = useId();

  const [value, setValue] = useState(currentName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = getDisplayNameError(value);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Nothing changed: just close.
    if (normalizeDisplayName(value) === normalizeDisplayName(currentName)) {
      onCancel();
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(value);
    } catch (saveError) {
      console.error("Failed to save display name:", saveError);
      setError("We couldn't save your name. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="sr-only">
        Display name
      </label>
      <Input
        id={inputId}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError("");
        }}
        disabled={saving}
        autoFocus
        autoComplete="name"
        maxLength={60}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </div>
    </form>
  );
}

export default function AccountDetails() {
  const { user, profile, updateDisplayName } = useAuth();
  const [editingName, setEditingName] = useState(false);

  const displayName = profile?.name || user?.displayName || "";
  const memberSince = formatLongDate(getMemberSinceDate(profile, user));

  async function saveName(name) {
    await updateDisplayName(name);
    toast.success("Display name updated");
    setEditingName(false);
  }

  return (
    <ProfileSection icon={User} title="Account">
      <dl className="divide-y divide-border rounded-xl border border-border px-4 py-4">
        <DetailRow
          icon={User}
          label="Display name"
          action={
            !editingName && (
              <Button
                variant="ghost"
                size="sm"
                className="-my-1"
                onClick={() => setEditingName(true)}
                aria-label="Edit display name"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
            )
          }
        >
          {editingName ? (
            <DisplayNameEditor
              currentName={displayName}
              onCancel={() => setEditingName(false)}
              onSave={saveName}
            />
          ) : (
            displayName || <span className="font-normal text-muted-foreground">Not set</span>
          )}
        </DetailRow>

        <DetailRow icon={Mail} label="Email address">
          {user?.email}
        </DetailRow>

        <DetailRow icon={CalendarDays} label="Member since">
          {memberSince || <span className="font-normal text-muted-foreground">Unknown</span>}
        </DetailRow>
      </dl>
    </ProfileSection>
  );
}