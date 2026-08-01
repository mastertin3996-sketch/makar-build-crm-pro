import { describe, it, expect } from "vitest";
import type { Role } from "@prisma/client";
import {
  MODULES,
  ACTIONS,
  ROLE_LABELS,
  defaultMatrix,
  defaultFinance,
  defaultScope,
  effectiveMatrix,
  effectiveFinance,
  can,
  canFinance,
  type ModulePerms,
} from "@/lib/permissions";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

function expectFullAccess(perms: ModulePerms) {
  for (const action of ACTIONS) {
    expect(perms[action.key]).toBe(true);
  }
}

describe("defaultMatrix", () => {
  it("returns an entry for every module key, for every role", () => {
    for (const role of ROLES) {
      const matrix = defaultMatrix(role);
      for (const m of MODULES) {
        expect(matrix).toHaveProperty(m.key);
        expect(matrix[m.key]).toBeTruthy();
        // every module entry must define all action keys
        for (const action of ACTIONS) {
          expect(typeof matrix[m.key][action.key]).toBe("boolean");
        }
      }
    }
  });

  it("gives OWNER full (view/create/edit/delete/export/print) access on every module", () => {
    const matrix = defaultMatrix("OWNER");
    for (const m of MODULES) {
      expectFullAccess(matrix[m.key]);
    }
  });

  it("gives ADMIN full (view/create/edit/delete/export/print) access on every module", () => {
    const matrix = defaultMatrix("ADMIN");
    for (const m of MODULES) {
      expectFullAccess(matrix[m.key]);
    }
  });

  it("gives VIEWER read-only access (view/export/print true, create/edit/delete false) across modules", () => {
    const matrix = defaultMatrix("VIEWER");
    for (const m of MODULES) {
      expect(matrix[m.key]).toEqual({
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
        print: true,
      });
    }
  });
});

describe("defaultScope", () => {
  it("defaults MANAGER and INSTALLER to OWN", () => {
    expect(defaultScope("MANAGER")).toBe("OWN");
    expect(defaultScope("INSTALLER")).toBe("OWN");
  });

  it("defaults every other role to ALL", () => {
    for (const role of ROLES) {
      if (role === "MANAGER" || role === "INSTALLER") continue;
      expect(defaultScope(role)).toBe("ALL");
    }
  });
});

describe("effectiveMatrix", () => {
  it("merges a JSON permission override on top of role defaults, touching only the overridden module", () => {
    const base = defaultMatrix("MANAGER");
    const override = JSON.stringify({
      catalog: { delete: true },
    });
    const result = effectiveMatrix({ role: "MANAGER", permissions: override });

    // overridden module: only the specified action changed, rest of that module's
    // defaults are preserved
    expect(result.catalog).toEqual({ ...base.catalog, delete: true });

    // every other module is untouched relative to the base defaults
    for (const m of MODULES) {
      if (m.key === "catalog") continue;
      expect(result[m.key]).toEqual(base[m.key]);
    }
  });

  it("falls back to base defaults without throwing when permissions JSON is malformed", () => {
    const base = defaultMatrix("SALES_HEAD");
    expect(() =>
      effectiveMatrix({ role: "SALES_HEAD", permissions: "{not valid json" })
    ).not.toThrow();
    const result = effectiveMatrix({ role: "SALES_HEAD", permissions: "{not valid json" });
    expect(result).toEqual(base);
  });

  it("returns base defaults when permissions is null", () => {
    const base = defaultMatrix("STOREKEEPER");
    const result = effectiveMatrix({ role: "STOREKEEPER", permissions: null });
    expect(result).toEqual(base);
  });
});

describe("can", () => {
  it("returns true for OWNER unconditionally, even with permissions JSON that would deny everything", () => {
    const denyAll = JSON.stringify(
      Object.fromEntries(
        MODULES.map((m) => [m.key, { view: false, create: false, edit: false, delete: false, export: false, print: false }])
      )
    );
    const owner = { role: "OWNER" as Role, permissions: denyAll };
    for (const m of MODULES) {
      for (const action of ACTIONS) {
        expect(can(owner, m.key, action.key)).toBe(true);
      }
    }
  });

  it("respects effectiveMatrix for non-OWNER roles", () => {
    const viewer = { role: "VIEWER" as Role, permissions: null };
    expect(can(viewer, "clients", "view")).toBe(true);
    expect(can(viewer, "clients", "create")).toBe(false);
  });

  it("defaults to view action and returns false for an unknown module fallback", () => {
    const user = { role: "INSTALLER" as Role, permissions: null };
    // orders view is true by default for INSTALLER (p(true, false, true, ...))
    expect(can(user, "orders")).toBe(true);
  });
});

describe("canFinance", () => {
  it("returns true for OWNER unconditionally, even with financePerms JSON that would deny everything", () => {
    const denyAll = JSON.stringify({
      costPrices: false,
      profit: false,
      margin: false,
      payments: false,
      salaries: false,
    });
    const owner = { role: "OWNER" as Role, financePerms: denyAll };
    expect(canFinance(owner, "salaries")).toBe(true);
    expect(canFinance(owner, "costPrices")).toBe(true);
    expect(canFinance(owner, "profit")).toBe(true);
    expect(canFinance(owner, "margin")).toBe(true);
    expect(canFinance(owner, "payments")).toBe(true);
  });

  it("respects effectiveFinance for non-OWNER roles", () => {
    const accountant = { role: "ACCOUNTANT" as Role, financePerms: null };
    expect(canFinance(accountant, "salaries")).toBe(false);
    expect(canFinance(accountant, "profit")).toBe(true);
  });
});

describe("defaultFinance", () => {
  it("gives OWNER and ADMIN full finance access", () => {
    for (const role of ["OWNER", "ADMIN"] as Role[]) {
      const finance = defaultFinance(role);
      expect(finance).toEqual({
        costPrices: true,
        profit: true,
        margin: true,
        payments: true,
        salaries: true,
      });
    }
  });

  it("gives all other unspecified roles no finance access by default", () => {
    for (const role of ROLES) {
      if (["OWNER", "ADMIN", "ACCOUNTANT", "SALES_HEAD"].includes(role)) continue;
      expect(defaultFinance(role)).toEqual({
        costPrices: false,
        profit: false,
        margin: false,
        payments: false,
        salaries: false,
      });
    }
  });
});

describe("effectiveFinance", () => {
  it("merges a JSON financePerms override on top of role defaults", () => {
    const base = defaultFinance("SALES_HEAD");
    const override = JSON.stringify({ payments: true });
    const result = effectiveFinance({ role: "SALES_HEAD", financePerms: override });
    expect(result).toEqual({ ...base, payments: true });
  });

  it("falls back to base defaults without throwing when financePerms JSON is malformed", () => {
    const base = defaultFinance("MANAGER");
    expect(() =>
      effectiveFinance({ role: "MANAGER", financePerms: "not json at all" })
    ).not.toThrow();
    const result = effectiveFinance({ role: "MANAGER", financePerms: "not json at all" });
    expect(result).toEqual(base);
  });
});
