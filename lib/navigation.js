import {
  ArrowLeftRight,
  Bookmark,
  CloudSun,
  Compass,
  LayoutDashboard,
  Map,
  Plane,
  Sparkles,
  Wallet,
} from "lucide-react";

// Single source of truth for sidebar links. Add a page here and it appears
// in the sidebar automatically.
export const sidebarMenus = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Trips", href: "/trips", icon: Map },
  { name: "Discover", href: "/discover", icon: Compass },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
  { name: "Expenses", href: "/expenses", icon: Wallet },
  { name: "Weather", href: "/weather", icon: CloudSun },
  { name: "Currency", href: "/currency", icon: ArrowLeftRight },
];

// Shortcuts shown on the dashboard. `tone` picks a semantic color pair
// (see the --info / --success / --primary tokens in globals.css).
export const quickActions = [
  {
    title: "Plan a trip",
    description: "Create a new itinerary with AI assistance.",
    href: "/trips/new",
    icon: Plane,
    tone: "info",
  },
  {
    title: "Saved trips",
    description: "View and manage your saved itineraries.",
    href: "/trips",
    icon: Bookmark,
    tone: "success",
  },
  {
    title: "AI assistant",
    description: "Get personalized travel recommendations.",
    href: "/assistant",
    icon: Sparkles,
    tone: "primary",
  },
];