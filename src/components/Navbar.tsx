"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, LayoutDashboard, Menu, X, Truck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      name: "Input Pengadaan",
      href: "/",
      icon: FileSpreadsheet,
    },
    {
      name: "Dashboard Analitik",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Labeling & Distribusi",
      href: "/tracking",
      icon: Truck,
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo Context */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3 group focus:outline-hidden">
            <div className="relative h-10 w-32 sm:w-36 flex items-center">
              <Image
                src="/logo/infomedia_logo.webp"
                alt="Infomedia Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block leading-tight">
                Asset Management
              </span>
              <span className="text-sm font-heading font-extrabold text-slate-900 leading-none">
                Pengadaan & Distribusi Asset
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Tabs & Status */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-rose-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Sync Status Badge */}
          <div className="flex items-center text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            <span className="font-medium text-[11px]">Sinkronisasi Google Sheets Aktif</span>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Buka Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2 shadow-md">
          <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            <span className="font-medium text-[11px]">Google Sheets Terkoneksi</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isActive
                  ? "bg-rose-50 text-rose-700 font-bold border border-rose-100"
                  : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-rose-600" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
