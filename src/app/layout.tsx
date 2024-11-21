
import type { Metadata } from "next";

import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import ReactQueryProvider from "@/components/custom/ReactQueryProvider";

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
      <ReactQueryProvider>
        <TooltipProvider>
          <body>{children}</body>
        </TooltipProvider>
      </ReactQueryProvider>
    </html>
  );
}
