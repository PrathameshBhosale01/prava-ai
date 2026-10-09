import ProfileGate from "@/components/auth/ProfileGate";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }) {
  return (
    <DashboardShell>
      <ProfileGate>{children}</ProfileGate>
    </DashboardShell>
  );
}
