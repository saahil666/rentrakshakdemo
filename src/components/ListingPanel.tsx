"use client";

import React from "react";
import Image from "next/image";
import {
  MapPin,
  Home,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  PhoneCall,
  Sparkles,
  Info,
  Calendar,
} from "lucide-react";

interface ListingPanelProps {
  isEscrowUnlocked: boolean;
  statusBadge: "red" | "green" | "amber" | "idle";
}

export const ListingPanel: React.FC<ListingPanelProps> = ({
  isEscrowUnlocked,
  statusBadge,
}) => {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full border border-slate-800/80">
      {/* Property Photo & Overlay Badges */}
      <div className="relative h-56 sm:h-64 w-full overflow-hidden group">
        <Image
          src="/apartment.jpg"
          alt="Luxury 2BHK Apartment in Koramangala"
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-md shadow-md">
            <Home className="w-3 h-3 text-cyan-400" />
            2 BHK Premium Flat
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
            Verified Walkthrough
          </span>
        </div>

        {/* Bottom Location & Price on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1 text-slate-300 text-xs font-medium drop-shadow">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>5th Block, Koramangala, Bangalore</span>
            </div>
            <h3 className="text-lg font-bold text-white drop-shadow-md">
              Suncity Parkview Residency
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Monthly Rent
            </span>
            <div className="text-base font-extrabold text-white">
              ₹28,000<span className="text-xs font-normal text-slate-300">/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Listing Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Deposit Required Highlight Box */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border border-cyan-500/30 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Required Advance Deposit
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              Zero-Trust Escrow
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-white">
              ₹15,000
            </span>
            <span className="text-[11px] text-slate-400">
              Held until biometric match passes
            </span>
          </div>
        </div>

        {/* Apartment Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>1,250 sqft Super Built-up</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Fully Furnished & Modular</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>East Facing Sunlit Balcony</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Reserved Car Parking</span>
          </div>
        </div>

        {/* Landlord Profile Box */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/40 shrink-0">
              <Image
                src="/landlord.jpg"
                alt="Ramesh Sharma"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">Ramesh Sharma</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">Listed Owner • Koramangala</p>
              <span className="text-[10px] font-mono text-cyan-300/80">+91 98450 12894</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              ID Enrolled
            </span>
          </div>
        </div>

        {/* Escrow Status Banner */}
        <div
          className={`p-3 rounded-xl border text-xs transition-all duration-300 flex items-start gap-2.5 ${
            isEscrowUnlocked
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : statusBadge === "red"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-slate-900/50 border-slate-800 text-slate-400"
          }`}
        >
          {isEscrowUnlocked ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusBadge === "red" ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-snug">
            <p className="font-semibold text-white">
              {isEscrowUnlocked
                ? "Escrow Vault: AUTHORIZED FOR PAYOUT"
                : statusBadge === "red"
                ? "Escrow Vault: FRAUD INTERCEPT ACTIVATED"
                : "Escrow Vault: LOCKED (Zero-Trust Gate)"}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isEscrowUnlocked
                ? "DetectifAI dual verification verified genuine speaker identity and zero synthetic cloning."
                : statusBadge === "red"
                ? "Transaction blocked. Advance deposit cannot be released due to audio verification failure."
                : "Advance deposit release is mathematically gated by DetectifAI cross-media biometric evaluation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
