import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAKAR BUILD CRM PRO",
  description: "CRM/ERP система для продажу будівельних матеріалів та огорож",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
