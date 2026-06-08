import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CARRIER_LABELS, formatUAH, formatDate } from "@/lib/labels";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function TtnPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "logistics", "print") && !can(me, "logistics", "view")) redirect("/");

  const { id } = await params;
  const s = await prisma.shipment.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!s) notFound();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href={`/logistics/${s.id}`} className="text-sm text-slate-500 hover:text-slate-700">← Назад</a>
        <PrintButton />
      </div>

      {/* Бланк ТТН */}
      <div className="border-2 border-slate-800 p-6">
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <div className="text-lg font-bold">ЕКСПРЕС-НАКЛАДНА (ТТН)</div>
            <div className="text-sm text-slate-600">{CARRIER_LABELS[s.carrier]}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Номер ТТН</div>
            <div className="font-mono text-xl font-bold tracking-wider">{s.ttn}</div>
            <div className="text-xs text-slate-500">{formatDate(s.createdAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-5">
          <Block title="Відправник">
            <Line label="Компанія" value="MAKAR BUILD" />
            <Line label="Місто" value={s.cityFrom ?? "—"} />
            <Line label="Платник" value={s.payer ?? "Отримувач"} />
          </Block>
          <Block title="Отримувач">
            <Line label="ПІБ" value={s.recipientName} />
            <Line label="Телефон" value={s.recipientPhone ?? "—"} />
            <Line label="Місто" value={s.cityTo ?? "—"} />
            <Line label="Адреса / відділення" value={s.address ?? "—"} />
          </Block>
        </div>

        <table className="w-full border-t-2 border-slate-800 text-sm">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="py-2 text-slate-500">Вага</td>
              <td className="py-2 text-right font-medium">{s.weight ? `${s.weight} кг` : "—"}</td>
              <td className="py-2 text-slate-500">Оголошена вартість</td>
              <td className="py-2 text-right font-medium">{s.declaredValue ? formatUAH(s.declaredValue) : "—"}</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-500">Вартість доставки</td>
              <td className="py-2 text-right font-medium">{s.cost ? formatUAH(s.cost) : "—"}</td>
              <td className="py-2 text-slate-500">Замовлення</td>
              <td className="py-2 text-right font-medium">{s.order ? `#${s.order.number}` : "—"}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex items-end justify-between">
          <div className="text-center">
            {/* Імітація штрих-коду */}
            <div className="flex h-12 items-end gap-px">
              {s.ttn.split("").map((d, i) => (
                <span key={i} className="bg-slate-900" style={{ width: 2 + (Number(d) % 3), height: "100%" }} />
              ))}
            </div>
            <div className="mt-1 font-mono text-xs tracking-widest">{s.ttn}</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="mb-6">Підпис відправника ___________</div>
            <div>Підпис отримувача ___________</div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 print:hidden">
        Демо-бланк прототипу. У продакшені друкується офіційна форма перевізника.
      </p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold uppercase text-slate-700">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
