"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AuthUser, signin, signup } from "@/lib/auth";

type Props = { onSignedIn: (user: AuthUser) => void };

export function AuthScreen({ onSignedIn }: Props) {
  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-indigo-100/70 via-violet-50/40 to-transparent"
      />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden
            >
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
            </svg>
          </div>
          <h1 className="bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            Legal document creator
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to draft agreements and access your saved documents.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Create account
                </TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <CredentialsForm
                  mode="signin"
                  submitLabel="Sign in"
                  action={signin}
                  onSuccess={onSignedIn}
                />
              </TabsContent>
              <TabsContent value="signup">
                <CredentialsForm
                  mode="signup"
                  submitLabel="Create account"
                  action={signup}
                  onSuccess={onSignedIn}
                  helpText="Password must be at least 8 characters."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function CredentialsForm({
  mode,
  submitLabel,
  action,
  onSuccess,
  helpText,
}: {
  mode: "signin" | "signup";
  submitLabel: string;
  action: (email: string, password: string) => Promise<AuthUser>;
  onSuccess: (user: AuthUser) => void;
  helpText?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await action(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-email`}>Email</Label>
        <Input
          id={`${mode}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input
          id={`${mode}-password`}
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {helpText && (
          <p className="text-xs text-muted-foreground">{helpText}</p>
        )}
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={submitting || !email || password.length < 8}
      >
        {submitting ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}
