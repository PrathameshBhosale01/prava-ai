import DashboardHero from "@/components/dashboard/DashboardHero";
import QuickActions from "@/components/dashboard/QuickActions";
import WeatherWidget from "@/components/dashboard/WeatherWidget";

export const metadata = {
  title: "Dashboard | Prava AI",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardHero />
      <QuickActions />
      <WeatherWidget />
    </div>
  );
}