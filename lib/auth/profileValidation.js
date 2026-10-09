import { validateInterests, validateName, validateUsername } from "./validation.js";

/** The "complete your profile" form: name + username + interests (no email/password). */
export function validateProfile(input) {
  const body = input && typeof input === "object" ? input : {};
  const checks = {
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
