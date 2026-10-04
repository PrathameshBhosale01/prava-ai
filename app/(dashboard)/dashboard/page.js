import DashboardHero from "@/components/dashboard/DashboardHero";
import QuickActions from "@/components/dashboard/QuickActions";

export const metadata = {
  title: "Dashboard | Prava AI",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardHero />
      <QuickActions />
    </div>
  );
}