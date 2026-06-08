import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { documentInnerHtml, DOCUMENT_STYLES } from "@/lib/documents-html";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "documents", "view")) redirect("/");

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!doc) notFound();

  const html = documentInnerHtml(doc, doc.client);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <style>{DOCUMENT_STYLES}</style>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href={`/documents/${doc.id}`} className="text-sm text-slate-500 hover:text-slate-700">← Назад</a>
        <PrintButton />
      </div>
      <div className="border border-slate-200 shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
