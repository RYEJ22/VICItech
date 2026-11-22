"use client";

import { ProfileAccountHub } from "@/components/features/profile/profile-account-hub";

export default function PublicProfilePage({ username, user, isAuthLoading }) {
  return (
    <ProfileAccountHub
      mode="public"
      targetUsername={username}
      user={user}
      isAuthLoading={isAuthLoading}
    />
  );
}
