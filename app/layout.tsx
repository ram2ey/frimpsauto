import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frimps Auto",
  description: "Mercedes-Benz workshop management",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
