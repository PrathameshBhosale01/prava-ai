// Shared limits and enums for the Travel Blog ("Zone"). Imported by both the
// server (validation) and the client (form hints), so keep it dependency-free.

export const CATEGORIES = [
  "City Break",
  "Beach",
  "Mountain",
  "Adventure",
  "Cultural",
  "Relaxation",
  "Business",
  "Family",
  "Romantic",
  "Solo Travel",
];

export const LIMITS = {
  title: { min: 3, max: 120 },
  content: { min: 20, max: 10000 },
  comment: { min: 1, max: 1000 },
  maxImages: 6,
  pageSize: { default: 12, max: 30 },
  // Search scans the newest N posts in memory (Firestore has no full-text
  // search). Plenty for now; swap for Algolia/Typesense if the blog outgrows it.
  searchScan: 300,
  searchResults: 30,
  searchTextContentChars: 600,
};

export const UPLOAD_FOLDER = "prava-zone";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
