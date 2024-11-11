import type { Metadata } from "next";
import {
  TooltipProvider,
} from "@/components/ui/tooltip"

import "./globals.css";


export const metadata: Metadata = {
  title: "Will Smith - 专业",
  description: "langsmith 日志平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <TooltipProvider>
      <body>{children}</body>
      </TooltipProvider>
    </html>
  );
}
