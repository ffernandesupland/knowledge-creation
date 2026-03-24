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
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased min-h-screen selection:bg-indigo-500/30 font-sans`}>
        {children}
      </body>
    </html>
  );
}
