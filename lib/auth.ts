import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { UAParser } from "ua-parser-js";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const COOKIE_ACCESS = "mbc_access";
const COOKIE_REFRESH = "mbc_refresh";
const ACCESS_TTL_SEC = 60 * 60 * 8; // 8 годин
const REFRESH_TTL_SEC = 60 * 60 * 24 * 7; // 7 днів

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "makar-build-crm-dev-secret-change-me"
);

// ----- Паролі -----
export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// ----- JWT -----
type AccessClaims = { sub: string; sid: string; role: string };

async function signAccess(claims: AccessClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secret);
}

export async function verifyAccess(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AccessClaims;
  } catch {
    return null;
  }
}

// ----- Сесії та вхід -----
type LoginMeta = { ip?: string; userAgent?: string };

export async function login(
  identifier: string,
  password: string,
  meta: LoginMeta = {}
): Promise<{ ok: boolean; error?: string }> {
  const id = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { login: id }] },
  });

  if (!user || !user.isActive) {
    return { ok: false, error: "Невірні дані або акаунт заблоковано" };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await audit("LOGIN_FAILED", { userId: user.id, details: id, ...meta });
    return { ok: false, error: "Невірний email/логін або пароль" };
  }

  const ua = new UAParser(meta.userAgent ?? "");
  const browser = [ua.getBrowser().name, ua.getBrowser().version]
    .filter(Boolean)
    .join(" ");
  const device =
    [ua.getOS().name, ua.getOS().version].filter(Boolean).join(" ") ||
    "Невідомий пристрій";

  const refreshToken = randomBytes(32).toString("hex");
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      browser: browser || null,
      device,
      location: ipToLocation(meta.ip),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const access = await signAccess({ sub: user.id, sid: session.id, role: user.role });
  const c = await cookies();
  c.set(COOKIE_ACCESS, access, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SEC,
  });
  c.set(COOKIE_REFRESH, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SEC,
  });

  await audit("LOGIN", { userId: user.id, ...meta });
  return { ok: true };
}

export async function logout() {
  const user = await getCurrentUser();
  const c = await cookies();
  const access = c.get(COOKIE_ACCESS)?.value;
  if (access) {
    const claims = await verifyAccess(access);
    if (claims?.sid) {
      await prisma.session.updateMany({
        where: { id: claims.sid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }
  if (user) await audit("LOGOUT", { userId: user.id });
  c.delete(COOKIE_ACCESS);
  c.delete(COOKIE_REFRESH);
}

export async function terminateAllSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const c = await cookies();
  c.delete(COOKIE_ACCESS);
  c.delete(COOKIE_REFRESH);
  await audit("SESSIONS_TERMINATED", { userId });
}

// ----- Поточний користувач -----
export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const token = c.get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  const claims = await verifyAccess(token);
  if (!claims?.sub || !claims?.sid) return null;

  const session = await prisma.session.findUnique({ where: { id: claims.sid } });
  if (!session || session.revokedAt) return null;

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || !user.isActive) return null;

  // оновлюємо "останню активність" (best-effort)
  prisma.session
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// ----- Аудит -----
export async function audit(
  action: string,
  opts: {
    userId?: string;
    entity?: string;
    entityId?: string;
    details?: string;
    ip?: string;
    userAgent?: string;
  } = {}
) {
  let { ip, userAgent } = opts;
  if (ip === undefined || userAgent === undefined) {
    try {
      const h = await headers();
      ip ??=
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        undefined;
      userAgent ??= h.get("user-agent") ?? undefined;
    } catch {
      // поза request-контекстом
    }
  }
  await prisma.auditLog.create({
    data: {
      action,
      userId: opts.userId ?? null,
      entity: opts.entity ?? null,
      entityId: opts.entityId ?? null,
      details: opts.details ?? null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

// Where-фрагмент для контролю видимості заявок (scope)
export async function requestScopeWhere(
  user: Pick<User, "id" | "role" | "requestScope">
): Promise<{ ownerId?: string | { in: string[] } }> {
  if (user.role === "OWNER" || user.role === "ADMIN") return {};
  if (user.requestScope === "ALL") return {};
  if (user.requestScope === "OWN") return { ownerId: user.id };
  // DEPARTMENT — свої заявки + заявки підлеглих
  const subs = await prisma.user.findMany({
    where: { managerId: user.id },
    select: { id: true },
  });
  return { ownerId: { in: [user.id, ...subs.map((s) => s.id)] } };
}

// Заглушка геолокації за IP (у проді — інтеграція з geo-сервісом)
function ipToLocation(ip?: string): string | null {
  if (!ip) return null;
  if (ip === "::1" || ip.startsWith("127.")) return "Локальна мережа";
  return null;
}

export const COOKIE_NAMES = { access: COOKIE_ACCESS, refresh: COOKIE_REFRESH };
