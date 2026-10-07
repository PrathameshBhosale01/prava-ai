"use client";

import { useState } from "react";
import { Check, Heart, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import ProfileSection from "@/components/profile/ProfileSection";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { sanitizePreferences } from "@/lib/profileValidation";
import { TRAVEL_INTERESTS } from "@/lib/travelInterests";
import { cn } from "@/lib/utils";

export default function TravelPreferences() {
  const { profile, updatePreferences } = useAuth();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  // Older accounts have no `preferences` field: sanitize treats that as [].
  const saved = sanitizePreferences(profile?.preferences);
  const changed =
    draft.length !== saved.length || draft.some((item) => !saved.includes(item));

  function startEditing() {
    setDraft(saved);
    setEditing(true);
  }

  function toggle(item) {
    setDraft((current) =>
      current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
    );
  }

  async function save() {
    setSaving(true);
    try {
      await updatePreferences(draft);
      toast.success("Travel preferences updated");
      setEditing(false);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("We couldn't save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileSection
      icon={Heart}
      title="Travel preferences"
      action={
        !editing && profile && (
          <Button variant="ghost" size="sm" onClick={startEditing} aria-label="Edit travel preferences">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        )
      }
    >
      {!profile && (
        <div className="flex flex-wrap gap-2" role="status" aria-label="Loading preferences">
          {[84, 112, 72, 96].map((width) => (
            <Skeleton key={width} className="h-7 rounded-full" style={{ width }} />
          ))}
        </div>
      )}

      {profile && !editing && (
        <>
          {saved.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {saved.map((item) => (
                <li
                  key={item}
                  className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t picked any yet. Choose the kinds of travel you enjoy.
            </p>
          )}
        </>
      )}

      {profile && editing && (
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Travel interests">
            {TRAVEL_INTERESTS.map((item) => {
              const selected = draft.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(item)}
                  disabled={saving}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  )}
                >
                  {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                  {item}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !changed}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}