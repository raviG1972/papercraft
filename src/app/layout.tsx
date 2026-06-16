import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaperCraft — Question Paper Creator",
  description: "Create question papers easily with rich text, images, and mathematical equations.",
  keywords: ["question paper", "exam", "math equations", "education", "LaTeX"],
  authors: [{ name: "PaperCraft" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PaperCraft — Question Paper Creator",
    description: "Create question papers with rich text, images, and math equations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PaperCraft — Question Paper Creator",
    description: "Create question papers with rich text, images, and math equations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
