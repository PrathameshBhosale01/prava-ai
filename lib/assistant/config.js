// Shared (client + server) configuration for the AI assistant.
// Everything tweakable about the assistant's behaviour lives here.

// ── Conversation limits ─────────────────────────────────────────────────────
export const MAX_USER_MESSAGE_CHARS = 1500;
export const MAX_ASSISTANT_HISTORY_CHARS = 4000;
export const MAX_HISTORY_MESSAGES = 20;

// ── Trip generation limits ──────────────────────────────────────────────────
export const MAX_TRIP_DAYS = 21;
export const MAX_TRAVELERS = 50;
export const DEFAULT_START_OFFSET_DAYS = 14;

// ── Usage limits (per user, per day) ────────────────────────────────────────
// "messages" = chat turns sent to the model.
// "plans"    = full itinerary generations (the expensive call).
// The Free plan matches the "limited AI requests per day" promise on the
// pricing section. Pro is "unlimited" in marketing, so it gets a high ceiling
// that only exists to protect your Gemini bill from runaway scripts.
export const USAGE_TIMEZONE = "Asia/Kolkata";
export const USAGE_LIMITS = {
  free: { messagesPerDay: 40, plansPerDay: 3 },
  pro: { messagesPerDay: 500, plansPerDay: 50 },
};

// ── Trip options (mirrors components/trips/TripForm.jsx) ────────────────────
export const TRIP_OPTIONS = {
  categories: [
    "Leisure",
    "Adventure",
    "Family",
    "Business",
    "Honeymoon",
    "Solo",
    "Backpacking",
  ],
  currencies: ["INR", "USD", "EUR", "GBP"],
  accommodations: ["Hotel", "Hostel", "Resort", "Apartment", "Villa", "Homestay"],
  transportations: ["Flight", "Train", "Bus", "Car", "Bike", "Mixed"],
  interests: [
    "History & Culture",
    "Nature & Outdoors",
    "Food & Dining",
    "Nightlife",
    "Shopping",
    "Art & Museums",
    "Adventure Sports",
    "Photography",
    "Beaches",
    "Mountains",
    "Architecture",
    "Music & Festivals",
    "Wellness & Spa",
  ],
};

// ── Welcome screen prompts ──────────────────────────────────────────────────
// `icon` is resolved to a lucide icon inside the UI layer.
export const QUICK_PROMPTS = [
  {
    icon: "plane",
    title: "Plan a weekend trip",
    hint: "Mumbai to Goa for 2, under ₹15,000",
    prompt: "Plan a weekend trip from Mumbai to Goa for 2 people with a budget of ₹15,000",
  },
  {
    icon: "sparkles",
    title: "Best time to visit Bali",
    hint: "Weather, crowds and prices by month",
    prompt: "What is the best time to visit Bali?",
  },
  {
    icon: "wallet",
    title: "Budget destinations",
    hint: "Affordable places for a 5-day break",
    prompt: "Suggest budget-friendly destinations in India for a 5-day trip",
  },
  {
    icon: "compass",
    title: "7-day Japan itinerary",
    hint: "Tokyo, Kyoto and beyond",
    prompt: "Create a 7-day itinerary for Japan",
  },
];