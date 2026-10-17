export interface ScenarioConfig {
  id: "scenario_a" | "scenario_b" | "scenario_c" | "scenario_d" | "custom";
  badge: string;
  title: string;
  shortDesc: string;
  longDesc: string;
  tourAudioUrl: string;
  noteAudioUrl: string;
  tourName: string;
  noteName: string;
  expectedOutcome: "BLOCKED_SYNTHETIC" | "BLOCKED_IMPERSONATION" | "UNLOCKED_GENUINE" | "UNLOCKED_WARNING";
  color: "rose" | "amber" | "emerald" | "blue";
}

export const SCENARIO_PRESETS: ScenarioConfig[] = [
  {
    id: "scenario_a",
    badge: "Scenario A",
    title: "AI Voice Clone Attack",
    shortDesc: "Scammer cloned landlord's voice using generative AI",
    longDesc: "Scammer stole the landlord's original property video tour, trained an AI voice clone of the landlord, and sent a WhatsApp voice message demanding ₹15,000 advance. DetectifAI detects the synthetic audio signature even though voice timbre matches the video.",
    tourAudioUrl: "/demo/scenario_a_tour_ai.wav",
    noteAudioUrl: "/demo/scenario_a_note_ai_clone.wav",
    tourName: "Original_Apartment_Tour_Koramangala.mp4 (audio)",
    noteName: "WhatsApp_VoiceNote_UrgentDeposit.opus",
    expectedOutcome: "BLOCKED_SYNTHETIC",
    color: "rose",
  },
  {
    id: "scenario_b",
    badge: "Scenario B",
    title: "Stolen Video / Human Impersonator",
    shortDesc: "Scammer uses their own real voice with stolen video",
    longDesc: "Scammer downloaded a legitimate video tour filmed by the real owner. Then the scammer sent an urgent voice note in their own real human voice demanding ₹15,000. Deepfake check confirms human speech, but Eidos speaker verification flags a voiceprint mismatch.",
    tourAudioUrl: "/demo/scenario_b_tour_real_male.wav",
    noteAudioUrl: "/demo/scenario_b_note_impersonator.wav",
    tourName: "Owner_Walkthrough_Video.mp4 (audio)",
    noteName: "WhatsApp_VoiceNote_TransferNow.opus",
    expectedOutcome: "BLOCKED_IMPERSONATION",
    color: "rose",
  },
  {
    id: "scenario_c",
    badge: "Scenario C",
    title: "Verified Genuine Landlord",
    shortDesc: "Authentic owner voice note matching video tour",
    longDesc: "The legitimate owner who filmed the walkthrough sends a real human WhatsApp voice note confirming lease details and deposit escrow terms. DetectifAI confirms genuine human speech and matching biometric voiceprint, unlocking escrow.",
    tourAudioUrl: "/demo/scenario_c_tour_real_landlord.wav",
    noteAudioUrl: "/demo/scenario_c_note_genuine_landlord.wav",
    tourName: "Owner_Flat_Tour_Koramangala.mp4 (audio)",
    noteName: "WhatsApp_VoiceNote_OwnerDepositRequest.opus",
    expectedOutcome: "UNLOCKED_GENUINE",
    color: "emerald",
  },
  {
    id: "scenario_d",
    badge: "Scenario D",
    title: "Dubbed Listing (Edge Case)",
    shortDesc: "Scammer voiced over stolen video & matches voice note",
    longDesc: "Scammer stripped original audio from a listing video, dubbed their own voice over it, and sent a matching voice note. DetectifAI marks both as human and matching. Escrow unlocks, but SubletShield triggers a high-visibility warning advising physical property deed verification.",
    tourAudioUrl: "/demo/scenario_d_tour_dubbed.wav",
    noteAudioUrl: "/demo/scenario_d_note_scammer_real.wav",
    tourName: "Dubbed_Listing_Video.mp4 (audio)",
    noteName: "WhatsApp_VoiceNote_ScammerVoice.opus",
    expectedOutcome: "UNLOCKED_WARNING",
    color: "amber",
  },
];
