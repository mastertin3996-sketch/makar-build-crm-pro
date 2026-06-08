"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, audit, terminateAllSessions } from "@/lib/auth";
import {
  can,
  MODULES,
  ACTIONS,
  FINANCE_PERMS,
  type ModuleKey,
  type ActionKey,
  type PermissionMatrix,
  type FinancePerms,
} from "@/lib/permissions";
import type { Role, RequestScope } from "@prisma/client";

async function requireAdmin(action: ActionKey = "view") {
  const me = await getCurrentUser();
  if (!me || !can(me, "employees", action)) {
    throw new Error("Недостатньо прав для керування співробітниками");
  }
  return me;
}

export async function createUser(formData: FormData) {
  const me = await requireAdmin("create");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = (String(formData.get("role")) || "MANAGER") as Role;
  if (!email || !fullName || password.length < 6) return;

  // лише власник може створювати власника
  if (role === "OWNER" && me.role !== "OWNER") return;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;

  const user = await prisma.user.create({
    data: {
      email,
      login: String(formData.get("login") ?? "").trim() || null,
      fullName,
      role,
      passwordHash: await hashPassword(password),
      managerId: String(formData.get("managerId") ?? "") || null,
    },
  });

  await audit("USER_CREATED", { userId: me.id, entity: "User", entityId: user.id, details: `${fullName} (${role})` });
  revalidatePath("/employees");
  redirect(`/employees/${user.id}`);
}

export async function toggleBlock(formData: FormData) {
  const me = await requireAdmin("edit");
  const id = String(formData.get("id") ?? "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;
  if (target.role === "OWNER") return; // власника не блокують
  if (target.id === me.id) return; // не блокуємо себе

  await prisma.user.update({
    where: { id },
    data: { isActive: !target.isActive },
  });
  if (target.isActive) await terminateAllSessions(id); // блокування — гасимо сесії
  await audit(target.isActive ? "USER_BLOCKED" : "USER_UNBLOCKED", {
    userId: me.id,
    entity: "User",
    entityId: id,
    details: target.fullName,
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
}

export async function changeRole(formData: FormData) {
  const me = await requireAdmin("edit");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;
  if (target.role === "OWNER" && me.role !== "OWNER") return;
  if (role === "OWNER" && me.role !== "OWNER") return;

  await prisma.user.update({ where: { id }, data: { role } });
  await audit("USER_ROLE_CHANGED", { userId: me.id, entity: "User", entityId: id, details: `${target.role} → ${role}` });
  revalidatePath(`/employees/${id}`);
}

export async function resetPassword(formData: FormData) {
  const me = await requireAdmin("edit");
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return;

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  await terminateAllSessions(id);
  await audit("USER_PASSWORD_RESET", { userId: me.id, entity: "User", entityId: id });
  revalidatePath(`/employees/${id}`);
}

export async function assignManager(formData: FormData) {
  const me = await requireAdmin("edit");
  const id = String(formData.get("id") ?? "");
  const managerId = String(formData.get("managerId") ?? "") || null;
  await prisma.user.update({ where: { id }, data: { managerId } });
  await audit("USER_MANAGER_ASSIGNED", { userId: me.id, entity: "User", entityId: id });
  revalidatePath(`/employees/${id}`);
}

export async function updatePermissions(formData: FormData) {
  const me = await requireAdmin("edit");
  const id = String(formData.get("id") ?? "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;

  // Матриця модулів
  const matrix = {} as PermissionMatrix;
  for (const m of MODULES) {
    const row = {} as Record<ActionKey, boolean>;
    for (const a of ACTIONS) {
      row[a.key] = formData.get(`perm.${m.key}.${a.key}`) === "on";
    }
    matrix[m.key as ModuleKey] = row;
  }

  // Фінансові права
  const fin = {} as FinancePerms;
  for (const f of FINANCE_PERMS) {
    fin[f.key] = formData.get(`fin.${f.key}`) === "on";
  }

  const scope = (String(formData.get("scope")) || "OWN") as RequestScope;

  await prisma.user.update({
    where: { id },
    data: {
      permissions: JSON.stringify(matrix),
      financePerms: JSON.stringify(fin),
      requestScope: scope,
    },
  });
  await audit("USER_PERMISSIONS_UPDATED", { userId: me.id, entity: "User", entityId: id });
  revalidatePath(`/employees/${id}`);
}
