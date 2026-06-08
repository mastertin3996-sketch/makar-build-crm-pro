import { defineConfig, env } from "prisma/config";

// Prisma 7 більше не завантажує .env автоматично — робимо це вручну (Node 24+).
try {
  process.loadEnvFile();
} catch {
  // .env може бути відсутнім у проді, де змінні задані в оточенні
}

// Конфіг Prisma 7. URL потрібен для команд migrate / db push / studio.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
