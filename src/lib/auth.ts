import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSessionSecret } from "@/lib/env";

const SHOP_COOKIE = "orify_shop";
const OWNER_COOKIE = "orify_owner";
const AGENT_COOKIE = "orify_agent";

function secret() {
  return new TextEncoder().encode(getSessionSecret());
}

export type ShopSession = {
  role: "shop";
  shopId: string;
  code: string;
  impersonatedBy?: "owner";
};

export type OwnerSession = {
  role: "owner";
};

export type AgentSession = {
  role: "agent";
  agentId: string;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createShopSession(
  data: Omit<ShopSession, "role">,
  days = 30,
) {
  const token = await new SignJWT({ ...data, role: "shop" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${days}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(SHOP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function createOwnerSession(days = 7) {
  const token = await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${days}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function getShopSession(): Promise<ShopSession | null> {
  const jar = await cookies();
  const token = jar.get(SHOP_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "shop") return null;
    return payload as unknown as ShopSession;
  } catch {
    return null;
  }
}

export async function getOwnerSession(): Promise<OwnerSession | null> {
  const jar = await cookies();
  const token = jar.get(OWNER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "owner") return null;
    return { role: "owner" };
  } catch {
    return null;
  }
}

export async function clearShopSession() {
  const jar = await cookies();
  jar.delete(SHOP_COOKIE);
}

export async function clearOwnerSession() {
  const jar = await cookies();
  jar.delete(OWNER_COOKIE);
}

export async function createAgentSession(agentId: string, days = 30) {
  const token = await new SignJWT({ role: "agent", agentId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${days}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(AGENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function getAgentSession(): Promise<AgentSession | null> {
  const jar = await cookies();
  const token = jar.get(AGENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "agent" || typeof payload.agentId !== "string") {
      return null;
    }
    return { role: "agent", agentId: payload.agentId };
  } catch {
    return null;
  }
}

export async function clearAgentSession() {
  const jar = await cookies();
  jar.delete(AGENT_COOKIE);
}

export async function impersonateShop(shopId: string, code: string) {
  await createShopSession({ shopId, code, impersonatedBy: "owner" });
}
