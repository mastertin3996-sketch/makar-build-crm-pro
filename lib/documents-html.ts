import { DOC_TYPE_LABELS, DOC_WITH_ITEMS, formatUAH, formatDate } from "@/lib/labels";

export type DocLike = {
  number: string;
  type: string;
  title: string;
  items: string | null;
  total: number;
  notes: string | null;
  createdAt: Date;
};

export type ClientLike = {
  fullName: string;
  company: string | null;
  edrpou: string | null;
  ipn: string | null;
  phone: string;
  address: string | null;
  email: string | null;
} | null;

type LineItem = { name: string; quantity: number; price: number };

// Реквізити постачальника (демо)
const SELLER = {
  name: 'ТОВ "МАКАР БУД"',
  edrpou: "44556677",
  address: "м. Київ, вул. Будівельна, 1",
  phone: "+380 (44) 000-00-00",
  iban: "UA00 3052 9900 0000 0001 2345 67890",
  bank: "АТ КБ «ПриватБанк»",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function itemsTable(items: LineItem[], total: number): string {
  const rows = items
    .map(
      (i, n) => `<tr>
        <td style="text-align:center">${n + 1}</td>
        <td>${esc(i.name)}</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right">${formatUAH(i.price)}</td>
        <td style="text-align:right">${formatUAH(i.price * i.quantity)}</td>
      </tr>`
    )
    .join("");
  return `<table class="items">
    <thead><tr><th>№</th><th>Найменування</th><th>К-сть</th><th>Ціна</th><th>Сума</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4" style="text-align:right"><b>Разом до сплати:</b></td><td style="text-align:right"><b>${formatUAH(total)}</b></td></tr></tfoot>
  </table>`;
}

function parties(client: ClientLike): string {
  return `<table class="parties"><tr>
    <td>
      <div class="ph">Постачальник</div>
      <div><b>${SELLER.name}</b></div>
      <div>ЄДРПОУ: ${SELLER.edrpou}</div>
      <div>${SELLER.address}</div>
      <div>тел.: ${SELLER.phone}</div>
    </td>
    <td>
      <div class="ph">${"Покупець / Замовник"}</div>
      <div><b>${esc(client?.company || client?.fullName || "—")}</b></div>
      ${client?.edrpou ? `<div>ЄДРПОУ: ${esc(client.edrpou)}</div>` : ""}
      ${client?.ipn ? `<div>ІПН: ${esc(client.ipn)}</div>` : ""}
      ${client?.address ? `<div>${esc(client.address)}</div>` : ""}
      <div>тел.: ${esc(client?.phone || "—")}</div>
    </td>
  </tr></table>`;
}

function signatures(left = "Постачальник", right = "Покупець"): string {
  return `<table class="sign"><tr>
    <td>${left}: _________________ <span class="muted">(підпис, М.П.)</span></td>
    <td>${right}: _________________ <span class="muted">(підпис)</span></td>
  </tr></table>`;
}

// Внутрішній HTML документа (без <html>-обгортки)
export function documentInnerHtml(doc: DocLike, client: ClientLike): string {
  const items: LineItem[] = doc.items ? JSON.parse(doc.items) : [];
  const date = formatDate(doc.createdAt);
  const head = `<div class="head">
    <div>
      <div class="logo">MAKAR BUILD</div>
      <div class="muted">CRM PRO</div>
    </div>
    <div class="dt">№ ${esc(doc.number)} від ${date}</div>
  </div>
  <h1>${esc(DOC_TYPE_LABELS[doc.type] ?? doc.type)}</h1>`;

  const withItems = DOC_WITH_ITEMS.includes(doc.type);
  let body = "";

  switch (doc.type) {
    case "INVOICE":
      body = `${parties(client)}
        <div class="bank">
          <div class="ph">Реквізити для оплати</div>
          <div>Банк: ${SELLER.bank}</div>
          <div>IBAN: ${SELLER.iban}</div>
          <div>Призначення: оплата за рахунком № ${esc(doc.number)}</div>
        </div>
        ${itemsTable(items, doc.total)}
        ${signatures("Виписав(ла)", "")}`;
      break;
    case "QUOTE":
      body = `${parties(client)}
        ${itemsTable(items, doc.total)}
        <p class="muted">Пропозиція дійсна протягом 7 календарних днів. Ціни вказано з урахуванням ПДВ.</p>
        ${signatures("Менеджер", "")}`;
      break;
    case "ACT":
      body = `${parties(client)}
        <p>Цим Актом сторони підтверджують, що роботи/товари за документом № ${esc(doc.number)} виконано/поставлено в повному обсязі, у належній якості та у строк. Сторони претензій одна до одної не мають.</p>
        ${itemsTable(items, doc.total)}
        ${signatures("Виконавець", "Замовник")}`;
      break;
    case "WAYBILL":
      body = `${parties(client)}
        ${itemsTable(items, doc.total)}
        ${signatures("Відпустив(ла)", "Отримав(ла)")}`;
      break;
    case "CONTRACT":
      body = `${parties(client)}
        <p><b>1. Предмет договору.</b> Постачальник зобов'язується передати у власність Покупця товар (огорожі, ворота, металоконструкції та супутні матеріали/послуги), а Покупець — прийняти та оплатити його на умовах цього Договору.</p>
        <p><b>2. Ціна та порядок розрахунків.</b> Загальна сума Договору становить <b>${formatUAH(doc.total)}</b>. Оплата здійснюється на поточний рахунок Постачальника (IBAN: ${SELLER.iban}).</p>
        <p><b>3. Строк дії.</b> Договір набирає чинності з моменту підписання і діє до повного виконання сторонами зобов'язань.</p>
        ${doc.notes ? `<p><b>Додаткові умови.</b> ${esc(doc.notes)}</p>` : ""}
        ${signatures()}`;
      break;
    case "WARRANTY":
      body = `${parties(client)}
        <p>Постачальник ${SELLER.name} надає гарантію на поставлену продукцію та виконані роботи строком <b>12 місяців</b> з дати передачі за документом № ${esc(doc.number)}.</p>
        <p>Гарантія поширюється на заводські дефекти матеріалів та якість монтажу за умови дотримання правил експлуатації. Гарантія не поширюється на механічні пошкодження та наслідки неправильної експлуатації.</p>
        ${signatures("Постачальник", "")}`;
      break;
    default:
      body = parties(client);
  }

  const note =
    doc.notes && doc.type !== "CONTRACT"
      ? `<p class="muted"><b>Примітки:</b> ${esc(doc.notes)}</p>`
      : "";

  return `${head}${body}${withItems ? note : ""}`;
}

const STYLES = `
  body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;padding:32px;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;}
  .logo{font-size:20px;font-weight:bold;}
  .muted{color:#64748b;font-size:13px;}
  .dt{text-align:right;font-size:13px;}
  h1{font-size:22px;margin:18px 0;}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;}
  table.parties td{vertical-align:top;width:50%;padding:8px 12px 8px 0;}
  .ph{font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:4px;}
  table.items th,table.items td{border:1px solid #cbd5e1;padding:6px 8px;}
  table.items th{background:#f1f5f9;text-align:left;}
  .bank{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin:12px 0;font-size:14px;}
  table.sign td{padding-top:36px;font-size:14px;width:50%;}
  p{font-size:14px;line-height:1.5;}
`;

// Повний HTML-документ (для друку / Word / Excel)
export function documentFullHtml(doc: DocLike, client: ClientLike): string {
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>${esc(doc.number)}</title><style>${STYLES}</style></head><body>${documentInnerHtml(doc, client)}</body></html>`;
}

export { STYLES as DOCUMENT_STYLES };
