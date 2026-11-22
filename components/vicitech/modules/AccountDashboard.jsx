"use client";

import { ProfileAccountHub } from "@/components/features/profile/profile-account-hub";

export default function AccountDashboard({
  user,
  isAuthLoading,
  onNavigate,
  onReconfigure,
  onSignOut,
}) {
  return (
    <ProfileAccountHub
      mode="self"
      user={user}
      isAuthLoading={isAuthLoading}
      onReconfigurePreset={onReconfigure}
      onNavigateModule={onNavigate}
      onSignOut={onSignOut}
    />
  );
}
