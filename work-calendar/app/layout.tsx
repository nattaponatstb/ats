import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Work Calendar",
  description: "ระบบปฏิทินการทำงาน จัดการงานและเอกสาร",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
