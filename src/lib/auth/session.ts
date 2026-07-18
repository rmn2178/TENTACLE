import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarHue: number;
}

export type UserRole = "admin" | "manager" | "agent";

/**
 * Get the current authenticated session. Returns null if not authenticated.
 */
export async function getSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as SessionUser;
  if (!user.id || !user.role) return null;
  return user;
}

/**
 * Require authentication. Throws a 401-shaped error if not authenticated.
 * Use in API route handlers.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    const err = new Error("Unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return user;
}

/**
 * Require a specific role or higher. Role hierarchy: admin > manager > agent.
 * Use for destructive actions like reset, resolve, or settings changes.
 */
export async function requireRole(minRole: UserRole): Promise<SessionUser> {
  const user = await requireAuth();
  const hierarchy: Record<UserRole, number> = { agent: 1, manager: 2, admin: 3 };
  const userLevel = hierarchy[user.role as UserRole] ?? 0;
  const requiredLevel = hierarchy[minRole];
  if (userLevel < requiredLevel) {
    const err = new Error(`Forbidden — requires ${minRole} role or higher`) as Error & {
      status: number;
    };
    err.status = 403;
    throw err;
  }
  return user;
}

/**
 * Wrap an API handler with authentication. Returns 401 if not authenticated.
 */
export function withAuth<T>(
  handler: (user: SessionUser) => Promise<T>
): Promise<T> {
  return requireAuth().then(handler).catch((err: Error & { status?: number }) => {
    throw err;
  });
}
