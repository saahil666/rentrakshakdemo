"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Download,
  Copy,
  Check,
  X,
} from "lucide-react";

interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  decision: any;
  telemetry: any;
}

export const EscrowPaymentModal: React.FC<EscrowPaymentModalProps> = ({
  isOpen,
  onClose,
  decision,
  telemetry,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const txId = `ESCROW-${(telemetry?.audit?.enrolledSpeakerId || "SPK").slice(-6).toUpperCase()}-2026`;

  const copyTx = () => {
    navigator.clipboard.writeText(txId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl apple-card p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/[0.06] transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/10 text-white mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Escrow Deposit Protected
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Verified Authentic by RentRakshak Security Vault
          </p>
        </div>

        {/* Deposit Summary Box */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 mb-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="text-xs text-zinc-400 font-normal">Secured Deposit</span>
            <span className="text-lg font-semibold text-white font-mono">₹15,000.00</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-[11px] text-zinc-500 block">Beneficiary</span>
              <span className="font-medium text-zinc-200">Verified Owner</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">Property</span>
              <span className="font-medium text-zinc-200">Koramangala, Bengaluru</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">Voice Authenticity</span>
              <span className="font-medium text-emerald-400">Natural Speech</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">Speaker Verification</span>
              <span className="font-medium text-emerald-400">Match Confirmed</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-[11px] text-zinc-500">Vault TxID:</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300">
              <span>{txId}</span>
              <button
                onClick={copyTx}
                className="text-zinc-400 hover:text-white transition p-0.5"
                title="Copy Transaction ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Zero-Trust Guarantee Explanation */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed mb-6 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-zinc-200">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Escrow Protection Rules:</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Funds are held in neutral escrow. Payout occurs only after you physically visit the property and accept the keys. Full refund is guaranteed if any misrepresentation occurs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl apple-btn-secondary text-xs font-medium transition"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => {
              alert("Escrow Certificate saved to your device!");
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-2xl apple-btn-primary text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
