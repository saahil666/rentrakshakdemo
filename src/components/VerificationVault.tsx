"use client";

import React from "react";
import { AudioDropzone } from "./AudioDropzone";
import { ScenarioPresets } from "./ScenarioPresets";
import { ScenarioConfig } from "@/lib/scenarios";
import { ShieldCheck, ArrowRight, Loader2, Lock } from "lucide-react";

interface VerificationVaultProps {
  tourFile: File | null;
  tourUrl: string | null;
  noteFile: File | null;
  noteUrl: string | null;
  onTourSelect: (file: File) => void;
  onTourClear: () => void;
  onNoteSelect: (file: File) => void;
  onNoteClear: () => void;
  selectedScenario: string;
  onSelectScenario: (scenario: ScenarioConfig | "custom") => void;
  onVerify: () => void;
  isVerifying: boolean;
  verifyStep: string;
}

export const VerificationVault: React.FC<VerificationVaultProps> = ({
  tourFile,
  tourUrl,
  noteFile,
  noteUrl,
  onTourSelect,
  onTourClear,
  onNoteSelect,
  onNoteClear,
  selectedScenario,
  onSelectScenario,
  onVerify,
  isVerifying,
  verifyStep,
}) => {
  const isReadyToVerify = !!noteFile;
  const isFullCrossCheck = !!tourFile && !!noteFile;

  return (
    <div className="apple-card rounded-3xl p-6 sm:p-7 space-y-5 border border-white/[0.08]">
      {/* Top Header & Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-zinc-300" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-200">
              Media Verification Vault
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">
            {isFullCrossCheck
              ? "Dual Stream Analysis Active"
              : isReadyToVerify
              ? "Single Stream Scan Active"
              : "Awaiting Media Uploads"}
          </span>
        </div>

        {/* Quick Test Preset Selector */}
        <ScenarioPresets
          selectedScenario={selectedScenario}
          onSelectScenario={onSelectScenario}
          isLoading={isVerifying}
        />
      </div>

      {/* Two Upload Dropzones */}
      <div className="space-y-3.5">
        {/* Dropzone 1: Walkthrough Video */}
        <AudioDropzone
          id="tour-audio"
          tag="Source 1: Walkthrough (Optional)"
          title="Property Walkthrough Video"
          subtitle="Owner's video tour. Audio is extracted to establish authentic voiceprint baseline."
          primaryUploadLabel="Choose Video / Audio Tour (.mp4, .wav)"
          audioFile={tourFile}
          audioUrl={tourUrl}
          onFileSelect={onTourSelect}
          onClear={onTourClear}
          minDurationText="Requires ≥15s speech for speaker matching"
        />

        {/* Dropzone 2: Voice Note */}
        <AudioDropzone
          id="note-audio"
          tag="Source 2: Demand Note (Required)"
          title="WhatsApp Voice Note"
          subtitle="Audio or video message demanding deposit payment"
          primaryUploadLabel="Choose Voice Note File (.ogg, .opus, .m4a, .wav)"
          audioFile={noteFile}
          audioUrl={noteUrl}
          onFileSelect={onNoteSelect}
          onClear={onNoteClear}
          allowRecord={true}
          minDurationText="Requires ≥4s speech for voice naturalness analysis"
        />
      </div>

      {/* Verify Action Bar */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.06]">
        <p className="text-[11px] text-zinc-400 text-center sm:text-left">
          {!isReadyToVerify
            ? "Upload the voice note to begin verification."
            : isFullCrossCheck
            ? "Both media streams ready for dual cross-verification."
            : "Single voice note ready for speech naturalness scan."}
        </p>

        <button
          type="button"
          disabled={!isReadyToVerify || isVerifying}
          onClick={onVerify}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-full font-medium text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
            !isReadyToVerify
              ? "bg-white/[0.04] text-zinc-500 border border-white/[0.06] cursor-not-allowed"
              : isVerifying
              ? "bg-white/[0.1] text-zinc-300 border border-white/15 cursor-wait"
              : "apple-btn-primary"
          }`}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{verifyStep || "Analyzing Audio Authenticity..."}</span>
            </>
          ) : isFullCrossCheck ? (
            <>
              <span>Run Cross-Verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Run Voice Scan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
