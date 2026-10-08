"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { passwordStrength } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

import Field from "./Field";

const METER = [
  { bar: "bg-danger", text: "text-danger" },
  { bar: "bg-danger", text: "text-danger" },
  { bar: "bg-warning", text: "text-warning" },
  { bar: "bg-info", text: "text-info" },
  { bar: "bg-success", text: "text-success" },
];

/** Password input with a show/hide toggle and an optional strength meter (sign-up only). */
export default function PasswordField({ showStrength = false, value, ...props }) {
  const [visible, setVisible] = useState(false);
  const { score, label } = passwordStrength(value);

  return (
    <div className="space-y-2">
      <Field
        {...props}
        value={value}
        type={visible ? "text" : "password"}
        icon={Lock}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        }
      />

      {showStrength && value && (
        <div>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < score ? METER[score].bar : "bg-surface-muted")} />
            ))}
          </div>
          <p role="status" className={cn("mt-1.5 text-xs font-medium", METER[score].text)}>
            Password strength: {label}
          </p>
        </div>
      )}
    </div>
  );
}
