import "katex/dist/katex.min.css";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Gonchar AI",
  description: "AI-репетитор по математике",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  themeColor: "#0b1220",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gonchar AI",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
