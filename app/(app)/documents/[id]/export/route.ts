import { prisma } from "@/lib/prisma";
import { getCurrentUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { documentFullHtml } from "@/lib/documents-html";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  if (!can(me, "documents", "export") && !can(me, "documents", "view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, include: { client: true } });
  if (!doc) return new Response("Not found", { status: 404 });

  const format = new URL(request.url).searchParams.get("format") === "xls" ? "xls" : "doc";
  const html = documentFullHtml(doc, doc.client);

  const mime =
    format === "xls"
      ? "application/vnd.ms-excel"
      : "application/msword";
  const filename = `${doc.number}.${format}`;

  await audit(format === "xls" ? "DOCUMENT_EXPORT_XLS" : "DOCUMENT_EXPORT_DOC", {
    userId: me.id,
    entity: "Document",
    entityId: doc.id,
    details: doc.number,
  });

  // ﻿ (BOM) — щоб Word/Excel коректно читали кирилицю
  return new Response("﻿" + html, {
    headers: {
      "Content-Type": `${mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
