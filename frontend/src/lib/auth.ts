// Auth client — JWT lives in an HttpOnly cookie set by the backend, so the
// frontend just needs to call these endpoints; cookies travel automatically.

export type AuthUser = {
  id: number;
  email: string;
};

export async function fetchMe(): Promise<AuthUser | null> {
  const r = await fetch("/api/auth/me");
  if (r.status === 401) return null;
  if (!r.ok) throw new Error(`Failed to load session (${r.status})`);
  return (await r.json()) as AuthUser;
}

async function postCredentials(
  path: "/api/auth/signup" | "/api/auth/signin",
  email: string,
  password: string,
): Promise<AuthUser> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const detail = await r
      .json()
      .then((b: { detail?: string }) => b?.detail)
      .catch(() => null);
    throw new Error(detail || `Request failed (${r.status})`);
  }
  return (await r.json()) as AuthUser;
}

export function signup(email: string, password: string): Promise<AuthUser> {
  return postCredentials("/api/auth/signup", email, password);
}

export function signin(email: string, password: string): Promise<AuthUser> {
  return postCredentials("/api/auth/signin", email, password);
}

export async function signout(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}
