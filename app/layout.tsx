import type { Metadata } from "next";
import "./globals.css";
import { APP_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL.startsWith("http") ? APP_URL : "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Slim root: <html>/<body> come from app/(root)/layout (id) or
  // app/[locale]/layout (localized) so lang/dir are always correct.
  return <>{children}</>;
}
