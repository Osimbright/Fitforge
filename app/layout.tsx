import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "FitForge — Forge your best self",
    template: "%s · FitForge",
  },
  description:
    "AI-powered workout and diet plans for home or gym. Track workouts, meals and progress, and ask your AI coach anything.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d0c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-fg" suppressHydrationWarning>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: { background: "#1b1f1d", border: "1px solid #262b28", color: "#f2f5f3" },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
