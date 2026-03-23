import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google"; // Modern premium fonts
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Knowledge Creator",
  description: "Generate structured KB articles from raw sources instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased min-h-screen selection:bg-indigo-500/30 font-sans`}
      >
        <div className="relative z-10">
          <header className="fixed top-0 w-full border-b border-white/5 bg-background/50 backdrop-blur-md z-50">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-outfit font-bold shadow-lg shadow-indigo-500/20">
                AI
              </div>
              <h1 className="text-xl font-outfit font-semibold tracking-wide bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Knowledge Creator
              </h1>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-6 pt-24 pb-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
