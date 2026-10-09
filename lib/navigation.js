import {
  ArrowLeftRight,
  Bookmark,
  CloudSun,
  Compass,
  LayoutDashboard,
  Inbox,
  Plane,
  Sparkles,
  Wallet,
  Users,
   Wrench,
  ChartColumn
} from "lucide-react";

// Single source of truth for sidebar links. Add a page here and it appears
// in the sidebar automatically.
export const sidebarMenus = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trips Inbox", href: "/trips", icon: Inbox },
  { name: "Discover", href: "/discover", icon: Compass },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
  {name: "Zone",href: "/zone",icon: Users,},
  {name: "Tools",href: "/tools",icon: Wrench,},
  { name: "Insights", href: "/insights", icon: ChartColumn },
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