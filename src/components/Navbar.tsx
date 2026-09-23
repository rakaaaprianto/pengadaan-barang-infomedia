"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, LayoutDashboard, Menu, X, Truck, Layers } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      name: "Input Pengadaan",
      href: "/",
      icon: FileSpreadsheet,
      badge: "Form",
    },
    {
      name: "Dashboard Analitik",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: "Chart",
    },
    {
      name: "Labeling & Distribusi",
      href: "/tracking",
      icon: Truck,
      badge: "Pipeline",
    },
  ];

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-colors">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo Context */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3 group focus:outline-hidden">
            <div className="relative h-10 w-32 sm:w-36 flex items-center">
              <Image
                src="/logo/infomedia_logo.webp"
                alt="Infomedia Logo"
                fill
                sizes="144px"
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="hidden sm:block border-l border-slate-200/80 pl-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block leading-tight">
                Facility & Asset Management
              </span>
              <span className="text-sm font-heading font-extrabold text-slate-900 leading-none">
                Pengadaan & Distribusi Aset
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Tabs & Status */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 shadow-2xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-rose-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-5 w-px bg-slate-200/80"></div>

          {/* Sync Status Badge */}
          <div className="flex items-center text-xs text-slate-600 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[11px] text-slate-700">Google Sheets Aktif</span>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 focus:outline-hidden"
            aria-label="Buka Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 pt-3 pb-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70 mb-2">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[11px] text-slate-700">Google Sheets Terkoneksi</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-rose-50 text-rose-700 font-bold border border-rose-100 shadow-2xs"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-rose-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

