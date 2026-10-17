"use client";

import React from "react";
import { SCENARIO_PRESETS, ScenarioConfig } from "@/lib/scenarios";
import {
  ShieldAlert,
  UserCheck,
  Bot,
  FileWarning,
  Upload,
} from "lucide-react";

interface ScenarioPresetsProps {
  selectedScenario: string;
  onSelectScenario: (scenario: ScenarioConfig | "custom") => void;
  isLoading: boolean;
}

export const ScenarioPresets: React.FC<ScenarioPresetsProps> = ({
  selectedScenario,
  onSelectScenario,
  isLoading,
}) => {
  const isCustom = selectedScenario === "custom";

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          Demo Scenarios
        </span>

        {isCustom ? (
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Upload className="w-3 h-3 text-zinc-300" />
            Custom File Upload
          </span>
        ) : (
          <button
            onClick={() => onSelectScenario("custom")}
            className="text-[11px] text-zinc-400 hover:text-white transition-colors"
          >
            Switch to Custom Upload &rarr;
          </button>
        )}
      </div>

      {/* Apple-style minimalist scenario selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {SCENARIO_PRESETS.map((scenario) => {
          const isSelected = selectedScenario === scenario.id;

          const getIcon = () => {
            switch (scenario.id) {
              case "scenario_a":
                return <Bot className="w-3.5 h-3.5" />;
              case "scenario_b":
                return <FileWarning className="w-3.5 h-3.5" />;
              case "scenario_c":
                return <UserCheck className="w-3.5 h-3.5" />;
              case "scenario_d":
                return <ShieldAlert className="w-3.5 h-3.5" />;
              default:
                return null;
            }
          };

          return (
            <button
              key={scenario.id}
              onClick={() => onSelectScenario(scenario)}
              disabled={isLoading}
              className={`p-3 rounded-2xl text-left transition-all border ${
                isSelected
                  ? "bg-white/[0.08] border-white/20 shadow-sm"
                  : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`p-1.5 rounded-lg ${isSelected ? "bg-white/10 text-white" : "bg-white/[0.04] text-zinc-400"}`}>
                  {getIcon()}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {scenario.expectedOutcome.startsWith("BLOCKED")
                    ? "Block"
                    : scenario.expectedOutcome === "UNLOCKED_GENUINE"
                    ? "Pass"
                    : "Caution"}
                </span>
              </div>
              <div className="text-xs font-medium text-white truncate">
                {scenario.title}
              </div>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                {scenario.shortDesc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
