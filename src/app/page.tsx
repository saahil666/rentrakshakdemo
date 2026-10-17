"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { VerificationVault } from "@/components/VerificationVault";
import {
  DecisionEngine,
  DecisionResult,
  TelemetryData,
} from "@/components/DecisionEngine";
import { EscrowPaymentModal } from "@/components/EscrowPaymentModal";
import { LandlordKycPortal } from "@/components/LandlordKycPortal";
import { ScenarioConfig } from "@/lib/scenarios";
import { VerifiedProperty } from "@/types/db";
import { ShieldAlert, Building, ShieldCheck, ArrowRight, X } from "lucide-react";

export default function RentRakshakApp() {
  const [apiKey, setApiKey] = useState<string>("");
  // View mode: 'tenant_vault' (Main Dashboard) or 'landlord_portal' (KYC & Listings)
  const [activeView, setActiveView] = useState<"tenant_vault" | "landlord_portal">("tenant_vault");

  // Selected scenario preset ('custom' by default for clean uploads)
  const [selectedScenario, setSelectedScenario] = useState<string>("custom");

  // Media files state (tour is optional for partial check, note is required)
  const [tourFile, setTourFile] = useState<File | null>(null);
  const [tourUrl, setTourUrl] = useState<string | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteUrl, setNoteUrl] = useState<string | null>(null);

  // Active target property context for escrow
  const [activePropertyContext, setActivePropertyContext] = useState<VerifiedProperty | null>(null);

  // Verification & Decision state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyStep, setVerifyStep] = useState<string>("");
  const [decision, setDecision] = useState<DecisionResult | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to load scenario audio files from URLs into File objects when a preset is clicked
  const loadScenarioAudio = async (scenario: ScenarioConfig) => {
    try {
      setErrorMessage(null);
      setDecision(null);
      setTelemetry(null);

      // Fetch tour audio/video
      const tourRes = await fetch(scenario.tourAudioUrl);
      const tourBlob = await tourRes.blob();
      const tourF = new File([tourBlob], scenario.tourName, {
        type: scenario.tourAudioUrl.endsWith(".mp4") ? "video/mp4" : "audio/wav",
      });
      setTourFile(tourF);
      setTourUrl(URL.createObjectURL(tourBlob));

      // Fetch note audio
      const noteRes = await fetch(scenario.noteAudioUrl);
      const noteBlob = await noteRes.blob();
      const noteF = new File([noteBlob], scenario.noteName, { type: "audio/wav" });
      setNoteFile(noteF);
      setNoteUrl(URL.createObjectURL(noteBlob));

      setSelectedScenario(scenario.id);
    } catch (err) {
      console.error("Failed to load scenario media:", err);
      setErrorMessage("Could not load preset media files. Please upload your files directly.");
    }
  };

  const handleSelectScenario = (scenario: ScenarioConfig | "custom") => {
    if (scenario === "custom") {
      setSelectedScenario("custom");
      setTourFile(null);
      setTourUrl(null);
      setNoteFile(null);
      setNoteUrl(null);
      setDecision(null);
      setTelemetry(null);
      setErrorMessage(null);
    } else {
      loadScenarioAudio(scenario);
    }
  };

  const handleTourSelect = (file: File) => {
    setSelectedScenario("custom");
    setTourFile(file);
    setTourUrl(URL.createObjectURL(file));
    setDecision(null);
    setTelemetry(null);
    setErrorMessage(null);
  };

  const handleTourClear = () => {
    setTourFile(null);
    setTourUrl(null);
    setDecision(null);
    setTelemetry(null);
  };

  const handleNoteSelect = (file: File) => {
    setSelectedScenario("custom");
    setNoteFile(file);
    setNoteUrl(URL.createObjectURL(file));
    setDecision(null);
    setTelemetry(null);
    setErrorMessage(null);
  };

  const handleNoteClear = () => {
    setNoteFile(null);
    setNoteUrl(null);
    setDecision(null);
    setTelemetry(null);
  };

  const handleVerify = async () => {
    if (!noteFile) {
      setErrorMessage("Please upload or record the WhatsApp voice note demanding advance deposit.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setDecision(null);
    setTelemetry(null);

    if (tourFile) {
      setVerifyStep("1/2: Analyzing voice naturalness on dual streams...");
      setTimeout(() => {
        setVerifyStep("2/2: Cross-verifying speaker identity...");
      }, 700);
    } else {
      setVerifyStep("Analyzing voice note naturalness...");
    }

    try {
      const formData = new FormData();
      if (tourFile) formData.append("tourFile", tourFile);
      formData.append("noteFile", noteFile);
      formData.append("scenario", selectedScenario);
      if (apiKey) formData.append("apiKey", apiKey);

      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.decision) {
        setDecision(data.decision);
        if (data.telemetry) setTelemetry(data.telemetry);
        return;
      }

      if (!res.ok || !data.success) {
        const errDetail = data.error?.message || data.error || "Verification failed";
        const errCode = data.error?.code ? ` (${data.error.code})` : "";
        throw new Error(`${errDetail}${errCode}`);
      }

      setDecision(data.decision);
      setTelemetry(data.telemetry);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Verification error:", err);
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
      setVerifyStep("");
    }
  };

  // Switch from Landlord Portal to Tenant Escrow with pre-loaded verified property
  const handleSelectPropertyForEscrow = async (prop: VerifiedProperty) => {
    setActivePropertyContext(prop);
    setActiveView("tenant_vault");
    setSelectedScenario("custom");
    setErrorMessage(null);
    setDecision(null);
    setTelemetry(null);

    // If property has video or audio, load as tour reference
    if (prop.tourAudioUrl || prop.videoUrl) {
      try {
        const mediaUrl = prop.videoUrl || prop.tourAudioUrl!;
        if (!mediaUrl.startsWith("blob:")) {
          const res = await fetch(mediaUrl);
          if (res.ok) {
            const blob = await res.blob();
            const f = new File(
              [blob],
              `${prop.title.slice(0, 20).replace(/\s+/g, "_")}${mediaUrl.endsWith(".mp4") ? ".mp4" : ".wav"}`,
              { type: mediaUrl.endsWith(".mp4") ? "video/mp4" : "audio/wav" }
            );
            setTourFile(f);
            setTourUrl(URL.createObjectURL(blob));
          }
        }
      } catch (err) {
        console.warn("Could not pre-fetch property media:", err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-white/20 selection:text-white">
      {/* Top Floating Navbar with macOS Segmented Pill Switcher */}
      <Navbar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col space-y-6">
        {/* Error Notification Banner if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20 text-rose-200 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-white transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: TENANT VERIFICATION VAULT                   */}
        {/* ---------------------------------------------------- */}
        {activeView === "tenant_vault" && (
          <div className="max-w-4xl mx-auto w-full space-y-5">
            {/* Top Verification Context Strip */}
            <div className="apple-card rounded-3xl p-4 sm:p-5 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shrink-0">
                  <ShieldCheck className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white tracking-tight">
                      Rental Listing &amp; Voice Verification
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-medium uppercase rounded-full badge-neutral">
                      Zero-Trust
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Target Property:{" "}
                    {activePropertyContext ? (
                      <span className="text-emerald-400 font-medium">{activePropertyContext.title} &bull; Landlord: {activePropertyContext.landlordName}</span>
                    ) : (
                      <span className="text-zinc-400">Direct Media Verification</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={() => setActiveView("landlord_portal")}
                  className="px-3.5 py-2 rounded-full apple-btn-secondary text-xs font-medium transition flex items-center gap-2"
                >
                  <Building className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Verified Landlords Directory</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Centered Media Upload Vault */}
            <VerificationVault
              tourFile={tourFile}
              tourUrl={tourUrl}
              noteFile={noteFile}
              noteUrl={noteUrl}
              onTourSelect={handleTourSelect}
              onTourClear={handleTourClear}
              onNoteSelect={handleNoteSelect}
              onNoteClear={handleNoteClear}
              selectedScenario={selectedScenario}
              onSelectScenario={handleSelectScenario}
              onVerify={handleVerify}
              isVerifying={isVerifying}
              verifyStep={verifyStep}
            />

            {/* Verification Results appear directly beneath media upload area */}
            {(decision || isVerifying) && (
              <div className="pt-1">
                <DecisionEngine
                  decision={decision}
                  telemetry={telemetry}
                  onPayDeposit={() => setIsModalOpen(true)}
                  isVerifying={isVerifying}
                />
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: LANDLORD KYC & ONBOARDING PORTAL             */}
        {/* ---------------------------------------------------- */}
        {activeView === "landlord_portal" && (
          <LandlordKycPortal
            apiKey={apiKey}
            onSelectPropertyForEscrow={handleSelectPropertyForEscrow}
          />
        )}
      </main>

      {/* Escrow Payout Modal */}
      <EscrowPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        decision={decision}
        telemetry={telemetry}
      />
    </div>
  );
}
