import {
  ArrowLeftRight,
  CloudSun,
  Compass,
  LayoutDashboard,
  Map,
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