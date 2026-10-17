"use client";

import React from "react";
import { Shield, Check } from "lucide-react";

interface NavbarProps {
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
  activeView: "tenant_vault" | "landlord_portal";
  onViewChange: (view: "tenant_vault" | "landlord_portal") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onViewChange,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 pt-4 pb-2">
      <div className="max-w-6xl mx-auto rounded-2xl bg-zinc-950/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] px-4 sm:px-6 h-14 flex items-center justify-between transition-all">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.08] border border-white/10 text-white">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight text-white">
              RentRakshak
            </span>
            <span className="text-[11px] text-zinc-400 font-normal hidden sm:inline">
              Verification Suite
            </span>
          </div>
        </div>

        {/* macOS / iOS Segmented Pill Control */}
        <div className="flex items-center p-1 rounded-full bg-white/[0.05] border border-white/[0.07] backdrop-blur-xl">
          <button
            onClick={() => onViewChange("tenant_vault")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeView === "tenant_vault"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Verification Vault
          </button>
          <button
            onClick={() => onViewChange("landlord_portal")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeView === "landlord_portal"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Landlord Portal
          </button>
        </div>

        {/* Clean Minimalist Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Protected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
