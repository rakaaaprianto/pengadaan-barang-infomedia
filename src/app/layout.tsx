import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard Pengadaan Asset | Facility & Asset Management",
  description: "Aplikasi internal input pengadaan asset dan dashboard analitik pengadaan asset PT Infomedia Nusantara.",
  icons: {
    icon: "/logo/infomedia_logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen flex flex-col bg-slate-50/80 text-slate-800 antialiased font-sans selection:bg-rose-500 selection:text-white">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {children}
          </main>
          <footer className="mt-auto border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-4 text-center text-xs text-slate-400">
            <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>&copy; {new Date().getFullYear()} Facility & Asset Management System. Terkoneksi dengan Google Sheets Data Source.</p>
              <div className="flex items-center space-x-4 text-xs font-medium text-slate-500">
                <span className="text-slate-400">PT Infomedia Nusantara</span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Status API: Aktif
                </span>
              </div>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}

