"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { ProductCategory } from "@prisma/client";

export async function createProduct(formData: FormData) {
  const me = await requireUser();
  if (!can(me, "catalog", "create")) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const product = await prisma.product.create({
    data: {
      name,
      sku: String(formData.get("sku") ?? "").trim() || null,
      category: (String(formData.get("category")) || "COMPONENTS") as ProductCategory,
      costPrice: Number(formData.get("costPrice") ?? 0) || 0,
      price: Number(formData.get("price") ?? 0) || 0,
      minPrice: Number(formData.get("minPrice") ?? 0) || 0,
      stock: Number(formData.get("stock") ?? 0) || 0,
      unit: String(formData.get("unit") ?? "шт").trim() || "шт",
      description: String(formData.get("description") ?? "").trim() || null,
    },
  });

  await audit("CREATE_PRODUCT", { userId: me.id, entity: "Product", entityId: product.id, details: name });
  revalidatePath("/catalog");
}
