import type { Metadata } from "next";
import { InstallAppProvider } from "@/components/install-app";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frimps Auto",
  description: "Mercedes-Benz workshop management",
  icons: { apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><InstallAppProvider>{children}</InstallAppProvider></body></html>;
}
