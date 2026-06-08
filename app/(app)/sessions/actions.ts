"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, terminateAllSessions } from "@/lib/auth";

export async function terminateAllAction() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  await terminateAllSessions(me.id);
  redirect("/login");
}
