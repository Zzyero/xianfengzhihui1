import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "先锋·智绘",
  description: "政治讽刺漫画生成",
};

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <html lang="zh-CN" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
