"use client";

import { ExternalLink, LogOut, Mail } from "lucide-react";

import UserAvatar from "@/components/layout/UserAvatar";
import AccountDetails from "@/components/profile/AccountDetails";
import AiUsageCard from "@/components/profile/AiUsageCard";
import ProfileStats from "@/components/profile/ProfileStats";
import TravelPreferences from "@/components/profile/TravelPreferences";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { getFeedbackHref } from "@/lib/appConfig";

export default function ProfileModal({ open, onClose }) {
  const { user, profile, logout } = useAuth();

  const displayName =
    profile?.name || user?.displayName || user?.email?.split("@")[0] || "Traveler";

  async function handleLogout() {
    onClose();
    await logout();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Your profile"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar
            photoURL={user?.photoURL}
            name={displayName}
            className="h-16 w-16 text-xl"
          />

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">{displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{user?.email}</span>
            </p>
          </div>
        </div>

        <ProfileStats />
        <AiUsageCard />
        <TravelPreferences />
        <AccountDetails />

        <div className="flex justify-end">
          <a
            href={getFeedbackHref()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Share feedback
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </Modal>
  );
}