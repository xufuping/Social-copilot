import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Geist 字体：shadcn 默认使用，无需改动
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Copilot",
  description: "AI-powered social chat copilot, sitting quietly in your sidebar.",
};

/**
 * 根布局。
 *
 * 注意点：
 *   - `h-screen` + `overflow-hidden`：整个窗口高度锁定，内部各面板自己负责滚动，
 *     避免 Tauri 无边框窗口被页面内容撑出滚动条。
 *   - `bg-background text-foreground`：让 Shadcn 的主题变量生效。
 *   - 默认跟随系统深色模式（见 `.dark` 选择器）——阶段一先保持浅色，后续再加开关。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
        {children}
      </body>
    </html>
  );
}
