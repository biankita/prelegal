"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signout, type AuthUser } from "@/lib/auth";

type Props = { user: AuthUser; onSignedOut: () => void };

export function UserMenu({ user, onSignedOut }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signout();
      onSignedOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-muted-foreground sm:block">
        {user.email}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        disabled={busy}
      >
        {busy ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
