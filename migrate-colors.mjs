// One-off: swap hardcoded light-only colors for the design tokens so these
// pages look right in both light and dark mode. Run once, then delete.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = [
  "app/(dashboard)",
  "app/login",
  "app/signup",
  "components/trips",
  "components/discover",
];

const RULES = [
  [/(?<![\w-])bg-white(?![\w-])/g, "bg-surface"],
  [/(?<![\w-])bg-gray-(?:50|100)(?![\w-])/g, "bg-surface-muted"],
  [/(?<![\w-])text-(?:gray-(?:700|800|900)|black)(?![\w-])/g, "text-foreground"],
  [/(?<![\w-])text-gray-(?:400|500|600)(?![\w-])/g, "text-muted-foreground"],
  [/(?<![\w-])border-gray-(?:100|200|300)(?![\w-])/g, "border-border"],
  [/(?<![\w-])bg-black(?![\w/-])/g, "bg-primary"],
  [/(?<![\w-])hover:bg-gray-800(?![\w-])/g, "hover:bg-primary-hover"],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return [".js", ".jsx"].includes(extname(path)) ? [path] : [];
  });
}

let total = 0;
for (const file of ROOTS.flatMap(walk)) {
  const before = readFileSync(file, "utf8");
  let after = before;
  let count = 0;

  for (const [pattern, replacement] of RULES) {
    after = after.replace(pattern, () => {
      count++;
      return replacement;
    });
  }

  if (after !== before) {
    writeFileSync(file, after);
    total += count;
    console.log(`${String(count).padStart(3)}  ${file}`);
  }
}
console.log(`\n${total} class names updated.`);