import type { Role, RequestScope } from "@prisma/client";

// ----- Модулі та дії -----
export const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clients", label: "Клієнти" },
  { key: "requests", label: "Заявки" },
  { key: "catalog", label: "Каталог" },
  { key: "warehouse", label: "Склад" },
  { key: "orders", label: "Замовлення" },
  { key: "logistics", label: "Логістика" },
  { key: "messengers", label: "Месенджери" },
  { key: "telephony", label: "Телефонія" },
  { key: "documents", label: "Документообіг" },
  { key: "finance", label: "Фінанси" },
  { key: "reports", label: "Звіти" },
  { key: "ai", label: "ШІ-помічник" },
  { key: "employees", label: "Співробітники" },
  { key: "audit", label: "Журнал дій" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const ACTIONS = [
  { key: "view", label: "Перегляд" },
  { key: "create", label: "Створення" },
  { key: "edit", label: "Редагування" },
  { key: "delete", label: "Видалення" },
  { key: "export", label: "Експорт" },
  { key: "print", label: "Друк" },
] as const;

export type ActionKey = (typeof ACTIONS)[number]["key"];
export type ModulePerms = Record<ActionKey, boolean>;
export type PermissionMatrix = Record<ModuleKey, ModulePerms>;

// ----- Фінансові права -----
export const FINANCE_PERMS = [
  { key: "costPrices", label: "Закупівельні ціни" },
  { key: "profit", label: "Прибуток" },
  { key: "margin", label: "Маржа" },
  { key: "payments", label: "Оплати" },
  { key: "salaries", label: "Зарплати" },
] as const;

export type FinanceKey = (typeof FINANCE_PERMS)[number]["key"];
export type FinancePerms = Record<FinanceKey, boolean>;

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Власник",
  ADMIN: "Адміністратор",
  SALES_HEAD: "Керівник продажів",
  MANAGER: "Менеджер",
  LOGIST: "Логіст",
  STOREKEEPER: "Комірник",
  ACCOUNTANT: "Бухгалтер",
  INSTALLER: "Монтажник",
  VIEWER: "Спостерігач",
};

export const SCOPE_LABELS: Record<RequestScope, string> = {
  OWN: "Лише свої заявки",
  DEPARTMENT: "Заявки відділу",
  ALL: "Усі заявки",
};

// ----- Хелпери побудови матриці -----
function fill(value: boolean): ModulePerms {
  return { view: value, create: value, edit: value, delete: value, export: value, print: value };
}
function p(
  view = false,
  create = false,
  edit = false,
  del = false,
  exp = false,
  print = false
): ModulePerms {
  return { view, create, edit, delete: del, export: exp, print };
}
const RO: ModulePerms = p(true, false, false, false, true, true); // лише перегляд/експорт/друк
const CRUD: ModulePerms = p(true, true, true, false, true, true); // без видалення
const FULL: ModulePerms = fill(true);
const NONE: ModulePerms = fill(false);

function build(map: Partial<Record<ModuleKey, ModulePerms>>): PermissionMatrix {
  const out = {} as PermissionMatrix;
  for (const m of MODULES) out[m.key] = map[m.key] ?? NONE;
  return out;
}

// ----- Дефолтні матриці за ролями -----
export function defaultMatrix(role: Role): PermissionMatrix {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return build(Object.fromEntries(MODULES.map((m) => [m.key, FULL])));
    case "SALES_HEAD":
      return build({
        dashboard: RO,
        clients: FULL,
        requests: FULL,
        catalog: RO,
        orders: CRUD,
        messengers: CRUD,
        telephony: FULL,
        documents: CRUD,
        reports: RO,
        ai: FULL,
        employees: RO,
        audit: RO,
      });
    case "MANAGER":
      return build({
        dashboard: RO,
        clients: CRUD,
        requests: CRUD,
        catalog: RO,
        orders: CRUD,
        messengers: CRUD,
        telephony: CRUD,
        documents: CRUD,
        ai: FULL,
      });
    case "LOGIST":
      return build({
        dashboard: RO,
        logistics: FULL,
        orders: RO,
        documents: p(true, true, false, false, true, true),
      });
    case "STOREKEEPER":
      return build({
        dashboard: RO,
        warehouse: FULL,
        catalog: RO,
      });
    case "ACCOUNTANT":
      return build({
        dashboard: RO,
        finance: FULL,
        documents: CRUD,
        reports: RO,
        clients: RO,
        requests: RO,
      });
    case "INSTALLER":
      return build({
        dashboard: RO,
        orders: p(true, false, true, false, false, false),
        documents: p(true, false, false, false, false, true),
      });
    case "VIEWER":
      return build(Object.fromEntries(MODULES.map((m) => [m.key, RO])));
    default:
      return build({});
  }
}

export function defaultFinance(role: Role): FinancePerms {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return { costPrices: true, profit: true, margin: true, payments: true, salaries: true };
    case "ACCOUNTANT":
      return { costPrices: true, profit: true, margin: true, payments: true, salaries: false };
    case "SALES_HEAD":
      return { costPrices: false, profit: true, margin: true, payments: false, salaries: false };
    default:
      return { costPrices: false, profit: false, margin: false, payments: false, salaries: false };
  }
}

export function defaultScope(role: Role): RequestScope {
  if (role === "MANAGER" || role === "INSTALLER") return "OWN";
  return "ALL";
}

// ----- Обчислення ефективних прав (з урахуванням override) -----
export type AuthUser = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  requestScope: RequestScope;
  permissions: string | null;
  financePerms: string | null;
};

export function effectiveMatrix(user: Pick<AuthUser, "role" | "permissions">): PermissionMatrix {
  const base = defaultMatrix(user.role);
  if (!user.permissions) return base;
  try {
    const override = JSON.parse(user.permissions) as Partial<PermissionMatrix>;
    for (const m of MODULES) {
      if (override[m.key]) base[m.key] = { ...base[m.key], ...override[m.key] };
    }
  } catch {
    // некоректний JSON — лишаємо дефолти
  }
  return base;
}

export function effectiveFinance(user: Pick<AuthUser, "role" | "financePerms">): FinancePerms {
  const base = defaultFinance(user.role);
  if (!user.financePerms) return base;
  try {
    return { ...base, ...(JSON.parse(user.financePerms) as Partial<FinancePerms>) };
  } catch {
    return base;
  }
}

export function can(
  user: Pick<AuthUser, "role" | "permissions">,
  module: ModuleKey,
  action: ActionKey = "view"
): boolean {
  if (user.role === "OWNER") return true; // власник — повний доступ
  return effectiveMatrix(user)[module]?.[action] ?? false;
}

export function canFinance(
  user: Pick<AuthUser, "role" | "financePerms">,
  key: FinanceKey
): boolean {
  if (user.role === "OWNER") return true;
  return effectiveFinance(user)[key];
}
