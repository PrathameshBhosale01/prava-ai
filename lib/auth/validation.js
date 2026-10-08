import { TRIP_OPTIONS } from "../assistant/config.js";

// Rules for the login / sign-up forms. Imported by BOTH the browser forms and the
// server (lib/auth/service.js), so the messages a person sees are exactly what the
// API enforces and the two can't drift apart. Pure functions, no dependencies.

export const INTEREST_OPTIONS = TRIP_OPTIONS.interests; // same 13 the AI assistant uses
export const MIN_INTERESTS = 3;

export const AUTH_LIMITS = {
  email: { max: 254 },
  password: { min: 8, max: 128 },
  name: { min: 2, max: 40 }, // 40 matches the users/{uid} Firestore rule
  username: { min: 3, max: 20 },
};

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "support", "help", "prava", "pravaai", "api", "www", "null",
  "undefined", "system", "moderator", "staff", "team", "official", "settings", "login", "signup",
  "zone", "dashboard", "me", "you", "anonymous", "traveler",
]);

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123",
  "qwertyuiop", "iloveyou", "11111111", "abc12345", "admin123", "welcome1", "letmein1",
]);

const stripControl = (value) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "");

/* -------------------------------- fields -------------------------------- */

export function validateEmail(raw) {
  const value = stripControl(raw).trim().toLowerCase();
  if (!value) return { value, error: "Enter your email address." };
  if (value.length > AUTH_LIMITS.email.max || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return { value, error: "That doesn't look like a valid email." };
  }
  return { value, error: "" };
}

// Passwords are never trimmed or altered: a space is a legitimate character.
export function validatePassword(raw) {
  const value = typeof raw === "string" ? raw : "";
  if (!value) return { value, error: "Create a password." };
  if (value.length < AUTH_LIMITS.password.min) return { value, error: `Use at least ${AUTH_LIMITS.password.min} characters.` };
  if (value.length > AUTH_LIMITS.password.max) return { value, error: `Keep it under ${AUTH_LIMITS.password.max} characters.` };
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return { value, error: "Add at least one letter and one number." };
  return { value, error: "" };
}

/** 0 "Too weak" · 1 "Weak" · 2 "Okay" · 3 "Good" · 4 "Strong". Empty input → score 0, no label. */
export function passwordStrength(raw) {
  const pw = typeof raw === "string" ? raw : "";
  if (!pw) return { score: 0, label: "" };

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (variety >= 3) score++;
  if (variety === 4 && pw.length >= 10) score++;
  if (pw.length < 8 || COMMON_PASSWORDS.has(pw.toLowerCase())) score = Math.min(score, 0);
  return { score, label: ["Too weak", "Weak", "Okay", "Good", "Strong"][score] };
}

export function validateName(raw) {
  const value = stripControl(raw).replace(/\s+/g, " ").trim();
  if (!value) return { value, error: "Enter your full name." };
  if (value.length < AUTH_LIMITS.name.min) return { value, error: `Your name should be at least ${AUTH_LIMITS.name.min} characters.` };
  if (value.length > AUTH_LIMITS.name.max) return { value, error: `Keep your name under ${AUTH_LIMITS.name.max} characters.` };
  return { value, error: "" };
}

/** Lowercases and drops a leading "@", since people type it out of habit. */
export function validateUsername(raw) {
  const value = stripControl(raw).trim().replace(/^@+/, "").toLowerCase();
  if (!value) return { value, error: "Choose a username." };
  const { min, max } = AUTH_LIMITS.username;
  if (!new RegExp(`^[a-z0-9_]{${min},${max}}$`).test(value)) {
    return { value, error: `Use ${min}–${max} letters, numbers or underscores.` };
  }
  if (RESERVED_USERNAMES.has(value)) return { value, error: "That username isn't available." };
  return { value, error: "" };
}

export function validateInterests(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const value = [...new Set(list)];
  if (!value.every((item) => INTEREST_OPTIONS.includes(item))) return { value: [], error: "Pick interests from the list." };
  if (value.length < MIN_INTERESTS) return { value, error: `Pick at least ${MIN_INTERESTS} interests.` };
  return { value, error: "" };
}

/* -------------------------------- forms -------------------------------- */

/** → { values: cleaned, fields: { fieldName: message } } (fields is empty when valid) */
export function validateSignup(input) {
  const body = input && typeof input === "object" ? input : {};
  const checks = {
    email: validateEmail(body.email),
    password: validatePassword(body.password),
    name: validateName(body.name),
    username: validateUsername(body.username),
    interests: validateInterests(body.interests),
  };
  const values = {};
  const fields = {};
  for (const [key, { value, error }] of Object.entries(checks)) {
    values[key] = value;
    if (error) fields[key] = error;
  }
  return { values, fields };
}

/** Login only checks presence/shape: the server decides whether the credentials are right. */
export function validateLogin(input) {
  const body = input && typeof input === "object" ? input : {};
  const email = validateEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const fields = {};
  if (email.error) fields.email = email.error;
  if (!password) fields.password = "Enter your password.";
  return { values: { email: email.value, password }, fields };
}
