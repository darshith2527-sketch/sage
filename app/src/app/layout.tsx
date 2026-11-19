import type { Metadata, Viewport } from "next";
// Fonts are bundled with the site (no request to Google Fonts).
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/familjen-grotesk";
import "@fontsource/mr-dafoe";
import "./globals.css";
import { Backdrop, SiteFooter, SiteNav } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Sage — agreements you understand",
  description:
    "Draft Indian agreements from verified clauses, explained in plain English. Review any agreement for risky clauses.",
};

export const viewport: Viewport = {
  themeColor: "#030a1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="relative min-h-full">
        <Backdrop />
        <SiteNav />
        <div className="relative z-10 flex min-h-full flex-col">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
