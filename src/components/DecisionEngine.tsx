"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface DecisionResult {
  scenarioCode: "SCENARIO_A" | "SCENARIO_B" | "SCENARIO_C" | "SCENARIO_D" | "SCENARIO_SOLO_AUDIO" | "SCENARIO_INSUFFICIENT_TOUR_SPEECH";
  isEscrowUnlocked: boolean;
  badgeColor: "red" | "green" | "amber";
  headline: string;
  reason: string;
  edgeCaseWarning: string | null;
}

export interface TelemetryData {
  deepfake: {
    requestId?: string;
    operationId?: string;
    verdict: "real" | "fake" | "not_sure";
    score: number;
    threshold: number;
    label?: string;
    isSynthetic: boolean;
    duration?: number;
    segments?: Array<{ start: number; end: number; score: number }>;
    timings?: { decode?: number; main?: number; total?: number };
  };
  deepfakeTour?: {
    requestId?: string;
    verdict: "real" | "fake" | "not_sure";
    score: number;
    threshold: number;
    isSynthetic: boolean;
    duration?: number;
  };
  deepfakeNote?: {
    requestId?: string;
    verdict: "real" | "fake" | "not_sure";
    score: number;
    threshold: number;
    isSynthetic: boolean;
    duration?: number;
  };
  speaker: {
    requestId?: string;
    operationId?: string;
    speakerId?: string;
    decision: "match" | "no_match";
    similarity: number;
    threshold: number;
    duration?: number;
    isMatch: boolean;
  };
  audit: {
    timestamp: string;
    totalLatencyMs: number;
    escrowGatewayStatus: string;
    enrolledSpeakerId?: string;
  };
}

interface DecisionEngineProps {
  decision: DecisionResult | null;
  telemetry: TelemetryData | null;
  onPayDeposit: () => void;
  isVerifying: boolean;
}

export const DecisionEngine: React.FC<DecisionEngineProps> = ({
  decision,
  telemetry,
  onPayDeposit,
  isVerifying,
}) => {
  const isUnlocked = decision?.isEscrowUnlocked || false;
  const isBlocked = decision && !decision.isEscrowUnlocked;
  const isSyntheticAttack = decision?.scenarioCode === "SCENARIO_A";
  const isImpersonationAttack = decision?.scenarioCode === "SCENARIO_B";
  const isSoloWarning = decision?.scenarioCode === "SCENARIO_SOLO_AUDIO";
  const isInsufficientTourSpeech = decision?.scenarioCode === "SCENARIO_INSUFFICIENT_TOUR_SPEECH";
  const isWarningPass = decision?.scenarioCode === "SCENARIO_D" || isSoloWarning || isInsufficientTourSpeech;

  return (
    <div
      className={`apple-card rounded-3xl p-5 sm:p-7 transition-all duration-300 flex flex-col justify-between space-y-5 h-full relative overflow-hidden ${
        isBlocked
          ? "border-rose-500/20"
          : isUnlocked && !isWarningPass
          ? "border-emerald-500/20"
          : isWarningPass
          ? "border-amber-500/20"
          : "border-white/[0.08]"
      }`}
    >
      {/* Top Header & Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Decision &amp; Escrow
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {decision ? (
              <span
                className={`px-3 py-1 text-[11px] font-medium rounded-full flex items-center gap-1.5 ${
                  isUnlocked
                    ? "badge-success"
                    : "badge-danger"
                }`}
              >
                {isUnlocked ? (
                  <>
                    <Unlock className="w-3 h-3" /> Escrow Open
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" /> Escrow Locked
                  </>
                )}
              </span>
            ) : (
              <span className="badge-neutral px-3 py-1 text-[11px] font-medium rounded-full">
                Awaiting Verification
              </span>
            )}
          </div>
        </div>

        {/* Clean Alert Banner */}
        {decision ? (
          <div
            className={`p-4 rounded-2xl border mb-3 transition-all ${
              isSyntheticAttack || isImpersonationAttack
                ? "bg-rose-500/[0.06] border-rose-500/20 text-rose-100"
                : isWarningPass
                ? "bg-amber-500/[0.06] border-amber-500/20 text-amber-100"
                : "bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-100"
            }`}
          >
            <div className="flex items-start gap-3">
              {isUnlocked ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="text-sm font-semibold tracking-tight text-white leading-snug">
                  {decision.headline}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  {decision.reason}
                </p>
                {decision.edgeCaseWarning && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{decision.edgeCaseWarning}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center mb-3">
            <Activity className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-zinc-200">
              Escrow Protection Ready
            </h4>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
              Run verification to cross-check voice naturalness and verify owner identity.
            </p>
          </div>
        )}
      </div>

      {/* Telemetry Overview - Human-Friendly, Clean, No Dev Clutter */}
      {telemetry && (
        <div className="space-y-3">
          <div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
            <span>Acoustic Verification Results</span>
            <span className="text-[11px] text-zinc-400">
              {telemetry.speaker?.isMatch && !telemetry.deepfake?.isSynthetic ? "Verified" : "Checked"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Check 1: Voice Authenticity */}
            <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300">
                    Voice Naturalness
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      telemetry.deepfake.verdict === "real"
                        ? "badge-success"
                        : telemetry.deepfake.verdict === "fake"
                        ? "badge-danger"
                        : "badge-neutral"
                    }`}
                  >
                    {telemetry.deepfake.verdict === "real" ? "Natural" : telemetry.deepfake.verdict === "fake" ? "Synthetic AI" : "Review"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] text-zinc-400">AI Risk Score:</span>
                  <span className="text-sm font-semibold text-white">
                    {(telemetry.deepfake.score * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Minimalist Progress Bar */}
                <div className="relative w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      telemetry.deepfake.score >= telemetry.deepfake.threshold
                        ? "bg-rose-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(100, telemetry.deepfake.score * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-400">
                <span>Confidence</span>
                <span className="text-zinc-300 font-medium">
                  {telemetry.deepfake.score < 0.3 ? "High Confidence Natural" : telemetry.deepfake.score > 0.7 ? "High Confidence AI" : "Moderate"}
                </span>
              </div>
            </div>

            {/* Check 2: Speaker Verification */}
            <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300">
                    Speaker Match
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      telemetry.speaker.decision === "match"
                        ? "badge-success"
                        : "badge-danger"
                    }`}
                  >
                    {telemetry.speaker.decision === "match" ? "Match Confirmed" : "Mismatch"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] text-zinc-400">Voice Similarity:</span>
                  <span className="text-sm font-semibold text-white">
                    {Math.max(0, Math.round(((telemetry.speaker.similarity + 1) / 2) * 100))}%
                  </span>
                </div>

                {/* Minimalist Progress Bar */}
                <div className="relative w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      telemetry.speaker.similarity >= telemetry.speaker.threshold
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, ((telemetry.speaker.similarity + 1) / 2) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-400">
                <span>Identity Status</span>
                <span className="text-zinc-300 font-medium">
                  {telemetry.speaker.decision === "match" ? "Verified Owner" : "Different Speaker"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escrow Gated Action Button */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!isUnlocked || isVerifying}
          onClick={onPayDeposit}
          className={`w-full py-3.5 px-6 rounded-2xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
            isUnlocked
              ? "apple-btn-primary"
              : "bg-white/[0.04] text-zinc-500 border border-white/[0.06] cursor-not-allowed"
          }`}
        >
          {isUnlocked ? (
            <>
              <Unlock className="w-4 h-4 text-zinc-950" />
              <span>Release Advance Deposit (₹15,000) to Escrow</span>
              <ArrowRight className="w-4 h-4 text-zinc-950" />
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-zinc-500" />
              <span>Deposit Protected • Awaiting Verification</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-zinc-500 mt-2 font-normal">
          {isUnlocked
            ? "Verification passed. Funds will be locked in neutral escrow until lease confirmation."
            : "Protected: Advance funds cannot be transferred until voice authenticity is established."}
        </p>
      </div>
    </div>
  );
};
