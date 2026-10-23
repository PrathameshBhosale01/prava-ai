import {
  CalendarCheck,
  Compass,
  Download,
  MapPinned,
  MessageSquareText,
  PiggyBank,
  Plane,
  Route,
  Sparkles,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";

import { planBullets } from "./billing/subscriptionView.js";
import { PLANS, PRICING, pricingSummary } from "./plans.js";
import { BRAND_NAME } from "./brand.js";

/**
 * Content for the marketing page. Anything that is also a product rule
 * (prices, plan limits) is read from lib/plans.js so the page can never
 * promise something the app doesn't do.
 */

/* ------------------------------- features -------------------------------- */

// `span` drives the bento grid on large screens: "wide" takes two columns.
export const services = [
  {
    icon: Sparkles,
    title: "Itineraries that think",
    description:
      `Describe the trip in your own words. ${BRAND_NAME} turns it into a day-by-day plan with real places, sensible travel times and room to breathe.`,
    span: "wide",
    accent: "brand",
  },
  {
    icon: MessageSquareText,
    title: "An assistant that remembers",
    description: "Chat your way to a plan, then save it to your trips in one tap.",
    accent: "cyan",
  },
  {
    icon: Route,
    title: "Multi-city routes",
    description: `Chain up to ${PLANS.pro.maxStops} cities with transfers, nights and travel days worked out for you.`,
    accent: "violet",
  },
  {
    icon: Wand2,
    title: "Refine a single day",
    description:
      "Not feeling day three? Regenerate just that day, or tell the assistant what to change — \"more food, fewer long walks\" — and it rewrites only that one.",
    span: "wide",
    accent: "violet",
  },
  {
    icon: Wallet,
    title: "Budgets that hold up",
    description:
      "Per-city estimates, transfer costs and an expense tracker, so the plan survives contact with reality.",
    span: "wide",
    accent: "amber",
  },
  {
    icon: Download,
    title: "Take it with you",
    description: "Print, save as PDF, export JSON or push the whole trip to your calendar.",
    accent: "cyan",
  },
];

/* ------------------------------- how it works ----------------------------- */

export const planSteps = [
  {
    step: "01",
    title: "Tell us the trip",
    description:
      "Where from, where to, how long, how many of you and what you're into. A sentence is enough — the assistant asks for anything it still needs.",
    icon: Compass,
  },
  {
    step: "02",
    title: `${BRAND_NAME} builds the plan`,
    description:
      "A full itinerary in under a minute: days, activities with timings, stays, a budget breakdown and local tips for every city on the route.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Make it yours, then go",
    description:
      "Reshape any day, track what you spend, share it with whoever is coming, and take the whole thing offline as a PDF or calendar.",
    icon: CalendarCheck,
  },
];

/* --------------------------------- proof ---------------------------------- */

export const heroStats = [
  { value: `${PLANS.free.credits}`, label: "AI credits free, every month" },
  { value: "< 60s", label: "From prompt to full itinerary" },
  { value: `${PLANS.pro.maxTripDays}`, label: "Days per trip on Pro" },
];

// Destinations shown in the scrolling strip under the hero.
export const popularRoutes = [
  "Mumbai → Goa",
  "Delhi → Manali",
  "Bengaluru → Coorg",
  "Kochi → Munnar",
  "Jaipur → Udaipur",
  "Kolkata → Darjeeling",
  "Chennai → Pondicherry",
  "Mumbai → Kerala",
  "Delhi → Rishikesh",
  "Hyderabad → Hampi",
];

// The sample plan drawn in the hero. Not a promise of prices, just a shape.
export const sampleTrip = {
  route: "Mumbai → Goa",
  meta: "5 days · 2 travellers · ₹48,000",
  days: [
    {
      day: "Day 1",
      city: "North Goa",
      items: [
        { time: "14:00", title: "Check in at Anjuna", note: "Settle in, late lunch nearby" },
        { time: "17:30", title: "Sunset at Vagator", note: "Chapora fort walk after" },
      ],
    },
    {
      day: "Day 2",
      city: "North Goa",
      items: [
        { time: "09:00", title: "Spice plantation tour", note: "Includes lunch · ~2.5 hrs" },
        { time: "19:00", title: "Night market", note: "Saturday only" },
      ],
    },
  ],
};

export const faqs = [
  {
    q: "Is it actually free to start?",
    a: `Yes. The Free plan gives you ${PLANS.free.credits} AI credits a month, up to ${PLANS.free.maxTrips} saved trips and full itinerary generation. No card needed to sign up.`,
  },
  {
    q: "How accurate are the plans?",
    a: `${BRAND_NAME} suggests real, well-known places and realistic timings, and it won't invent live prices or opening hours. Treat costs as estimates and check anything you're booking.`,
  },
  {
    q: "Can I change what it gives me?",
    a: "All of it. Edit any trip by hand, regenerate a single day, or tell the assistant what to change about a day and it rewrites just that one.",
  },
  {
    q: "Does it handle trips with several cities?",
    a: `Yes — up to ${PLANS.free.maxStops} cities per trip on Free and ${PLANS.pro.maxStops} on Pro, with nights, transfers and travel days built into the plan.`,
  },
  {
    q: "What happens to my trips if I cancel Pro?",
    a: "Nothing is deleted. You keep Pro until the period you've paid for ends, then move back to Free and can still view, print and export everything you made.",
  },
];

/* -------------------------------- about ----------------------------------- */

export const teamMember = {
  name: "Prathamesh Bhosale",
  role: `Full-stack developer · Creator of ${BRAND_NAME}`,
  image: "/images/my_pic.jpg",
  linkedin: "https://www.linkedin.com/in/prathamesh--bhosale/",
  github: "https://github.com/PrathameshBhosale01",
  email: "bhosaleprathamesh202@gmail.com",
};

export const aboutHighlights = [
  { icon: MapPinned, label: "Built end to end", detail: "Next.js, Firebase and Gemini" },
  { icon: Users, label: "Made for real trips", detail: "Shaped by the way people actually plan" },
  { icon: PiggyBank, label: "Free tier that works", detail: "Not a trial — a usable plan" },
];

/* -------------------------------- pricing --------------------------------- */

const summary = pricingSummary();

/** How much the yearly plan saves, as a whole percent, for the billing toggle badge. */
export const yearlyDiscountPercent = Math.round((summary.yearlySavings / (PRICING.monthly * 12)) * 100);

export const pricingPlans = [
  {
    id: "free",
    title: PLANS.free.name,
    icon: Plane,
    tagline: "Everything you need for your next trip",
    priceMonthly: "₹0",
    priceYearly: "₹0",
    noteMonthly: "Free forever",
    noteYearly: "Free forever",
    features: planBullets("free"),
    cta: "Start planning free",
    href: "/signup",
    featured: false,
  },
  {
    id: "pro",
    title: PLANS.pro.name,
    icon: Sparkles,
    tagline: "For people who travel often and plan properly",
    priceMonthly: `₹${PRICING.monthly}`,
    priceYearly: `₹${summary.yearlyPerMonth}`,
    noteMonthly: "per month, cancel anytime",
    noteYearly: `₹${PRICING.yearly.toLocaleString("en-IN")} billed yearly · save ₹${summary.yearlySavings}`,
    features: planBullets("pro"),
    cta: "Go Pro",
    href: "/subscription",
    featured: true,
  },
];
