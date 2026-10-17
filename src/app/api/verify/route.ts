import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { normalizeAudioWithFfmpeg } from "@/lib/audio";

export const maxDuration = 60; // 60 seconds timeout for audio analysis

interface DetectifAIDeepfakeResponse {
  request_id?: string;
  operation_id?: string;
  object?: string;
  credits?: { charged: number; balance: number };
  latency_ms?: number;
  result?: {
    verdict: "real" | "fake" | "not_sure";
    score: number;
    threshold: number;
    label: "synthetic" | "genuine" | "uncertain";
    is_synthetic: boolean;
    decided_by?: string;
    duration_seconds?: number;
    segments?: Array<{ start: number; end: number; score: number }>;
    timings_ms?: { decode?: number; main?: number; total?: number };
  };
  error?: {
    type: string;
    code: string;
    message: string;
    param?: string | null;
  };
}

interface DetectifAISpeakerResponse {
  request_id?: string;
  operation_id?: string;
  object?: string;
  speaker_id?: string;
  result?: {
    decision: "match" | "no_match";
    similarity: number;
    threshold: number;
    similarity_semantics?: string;
    duration_seconds?: number;
  };
  error?: {
    type: string;
    code: string;
    message: string;
    param?: string | null;
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const rawTourFile = formData.get("tourFile") as File | null;
    const rawNoteFile = formData.get("noteFile") as File | null;
    const scenarioHint = (formData.get("scenario") as string) || "custom";
    const customApiKey = (formData.get("apiKey") as string)?.trim();

    const apiKey = customApiKey || process.env.DETECTIFAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "DETECTIFAI_API_KEY is not configured in server environment or request headers.",
        },
        { status: 401 }
      );
    }

    if (!rawNoteFile) {
      return NextResponse.json(
        {
          success: false,
          error: "WhatsApp voice note ('noteFile') is required for escrow authorization.",
        },
        { status: 400 }
      );
    }

    const hasTour = !!rawTourFile;

    // Transcode and normalize ANY audio/video format (.ogg, .opus, .m4a, .mp3, .mp4, .mov, etc.) to 16kHz PCM WAV
    const noteAudio = await normalizeAudioWithFfmpeg(rawNoteFile, false);
    const tourAudio = hasTour && rawTourFile ? await normalizeAudioWithFfmpeg(rawTourFile, true) : null;

    const noteBuffer = noteAudio.buffer;
    const tourBuffer = tourAudio ? tourAudio.buffer : null;

    // Generate stable hash for tour speaker (or default hash)
    const tourHash = tourBuffer
      ? crypto.createHash("sha256").update(tourBuffer).digest("hex").slice(0, 16)
      : "no_tour_video";
    const speakerId = `tour_${tourHash}`;
    const idempotencyKeyDeepfake = `df_${crypto.createHash("sha256").update(noteBuffer).digest("hex").slice(0, 24)}`;
    const idempotencyKeyEnroll = `en_${speakerId}`;
    const idempotencyKeyVerify = `vr_${speakerId}_${crypto.createHash("sha256").update(noteBuffer).digest("hex").slice(0, 16)}`;

    const BASE_URL = "https://platform.detectif.ai/v1";

    // ----------------------------------------------------
    // CHECK 1: Deepfake Detection
    // ----------------------------------------------------
    // Check 1A: WhatsApp Voice Note Deepfake Check (Always executed)
    const dfNoteFormData = new FormData();
    const noteBlob = new Blob([new Uint8Array(noteBuffer)], { type: noteAudio.mime });
    dfNoteFormData.append("file", noteBlob, noteAudio.filename);

    const deepfakeNotePromise = fetch(`${BASE_URL}/deepfake/detect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": idempotencyKeyDeepfake,
      },
      body: dfNoteFormData,
    }).then(async (res) => {
      const data = (await res.json()) as DetectifAIDeepfakeResponse;
      return { status: res.status, data };
    });

    // Check 1B: Property Walkthrough Video Deepfake Check (Only if tour is uploaded)
    let deepfakeTourPromise: Promise<{ status: number; data: DetectifAIDeepfakeResponse }>;

    if (hasTour && tourAudio && tourBuffer) {
      const dfTourFormData = new FormData();
      const tourBlob = new Blob([new Uint8Array(tourBuffer)], { type: tourAudio.mime });
      dfTourFormData.append("file", tourBlob, tourAudio.filename);

      const idempotencyKeyTourDeepfake = `dft_${crypto.createHash("sha256").update(tourBuffer).digest("hex").slice(0, 24)}`;
      deepfakeTourPromise = fetch(`${BASE_URL}/deepfake/detect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": idempotencyKeyTourDeepfake,
        },
        body: dfTourFormData,
      }).then(async (res) => {
        const data = (await res.json()) as DetectifAIDeepfakeResponse;
        return { status: res.status, data };
      });
    } else {
      deepfakeTourPromise = Promise.resolve({
        status: 200,
        data: {
          object: "deepfake.detection",
          credits: { charged: 0, balance: 0 },
          latency_ms: 0,
        } as DetectifAIDeepfakeResponse,
      });
    }

    // Await deepfake checks concurrently (max 2 operations)
    const [deepfakeNoteResp, deepfakeTourResp] = await Promise.all([
      deepfakeNotePromise,
      deepfakeTourPromise,
    ]);

    const dfData = deepfakeNoteResp.data;
    const dfTourData = deepfakeTourResp.data;

    // Check for Note Deepfake API errors
    if (dfData.error && dfData.error.code !== "idempotency_key_reuse") {
      return NextResponse.json(
        {
          success: false,
          source: "DetectifAI Deepfake API (WhatsApp Note)",
          error: dfData.error,
          raw: { dfData, dfTourData },
        },
        { status: deepfakeNoteResp.status || 400 }
      );
    }

    if (hasTour && dfTourData.error && dfTourData.error.code !== "idempotency_key_reuse") {
      console.warn("DetectifAI Deepfake API notice (Tour Video Audio):", dfTourData.error);
    }

    // Extract note deepfake telemetry
    const noteVerdict = dfData.result?.verdict || "not_sure";
    const noteScore = dfData.result?.score ?? 0;
    const noteThreshold = dfData.result?.threshold ?? 0.62;
    const noteIsSynthetic = dfData.result?.is_synthetic ?? (noteVerdict === "fake" || noteScore >= noteThreshold);

    // Extract tour video audio deepfake telemetry
    const tourVerdict = dfTourData.result?.verdict || (hasTour ? "not_sure" : "not_uploaded");
    const tourScore = dfTourData.result?.score ?? 0;
    const tourThreshold = dfTourData.result?.threshold ?? 0.62;
    const tourIsSynthetic = hasTour && (dfTourData.result?.is_synthetic ?? (tourVerdict === "fake" || tourScore >= tourThreshold));

    // Composite Deepfake Evaluation
    const eitherIsSynthetic = noteIsSynthetic || tourIsSynthetic;
    const bothAreSynthetic = noteIsSynthetic && tourIsSynthetic;
    const maxSyntheticScore = Math.max(noteScore, tourScore);
    const primaryVerdict: "real" | "fake" | "not_sure" = eitherIsSynthetic
      ? "fake"
      : noteVerdict === "real" && (!hasTour || tourVerdict === "real")
      ? "real"
      : "not_sure";

    // ----------------------------------------------------
    // CHECK 2: Speaker Enrollment & Verification
    // (Only executed if BOTH media streams exist and passed deepfake check)
    // ----------------------------------------------------
    let speakerDecision: "match" | "no_match" = "no_match";
    let speakerSimilarity = 0;
    let speakerThreshold = 0.53;
    let isSpeakerMatch = false;
    let enrollmentFailureReason: string | null = null;
    let spkData: DetectifAISpeakerResponse = {
      object: "speaker.verification",
      result: {
        decision: "no_match",
        similarity: 0,
        threshold: 0.53,
        duration_seconds: 0,
      },
    };

    if (hasTour && tourAudio && tourBuffer && !eitherIsSynthetic) {
      const tourBlob = new Blob([new Uint8Array(tourBuffer)], { type: tourAudio.mime });

      // Substep 2a: Enroll tour audio as speaker with full validation
      const enrollFormData = new FormData();
      enrollFormData.append("speaker_id", speakerId);
      enrollFormData.append("file", tourBlob, tourAudio.filename);

      let isSpeakerEnrolled = false;

      try {
        const enrollResp = await fetch(`${BASE_URL}/speakers/enroll`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Idempotency-Key": idempotencyKeyEnroll,
          },
          body: enrollFormData,
        });

        const enrollData = await enrollResp.json();

        if (enrollResp.ok && enrollData.object === "speaker.enrollment") {
          isSpeakerEnrolled = true;
        } else if (enrollData.error?.code === "idempotency_key_reuse") {
          isSpeakerEnrolled = true;
        } else {
          isSpeakerEnrolled = false;
          enrollmentFailureReason =
            enrollData.error?.message ||
            "Video audio contains insufficient speech for biometric voiceprint enrollment (DetectifAI requires ≥10s of clear speech).";
          console.warn("DetectifAI speaker enrollment notice:", enrollData.error);
        }
      } catch (enrollErr: unknown) {
        const msg = enrollErr instanceof Error ? enrollErr.message : String(enrollErr);
        isSpeakerEnrolled = false;
        enrollmentFailureReason = msg;
        console.warn("Enrollment network/parse notice:", enrollErr);
      }

      // Substep 2b: Verify note audio against enrolled tour speaker
      // CRITICAL: Only call /speakers/verify if the speaker was successfully enrolled!
      if (isSpeakerEnrolled) {
        const verifyFormData = new FormData();
        verifyFormData.append("speaker_id", speakerId);
        verifyFormData.append("file", noteBlob, noteAudio.filename);

        try {
          const verifyResp = await fetch(`${BASE_URL}/speakers/verify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Idempotency-Key": idempotencyKeyVerify,
            },
            body: verifyFormData,
          });

          spkData = (await verifyResp.json()) as DetectifAISpeakerResponse;

          if (spkData.error && spkData.error.code !== "idempotency_key_reuse") {
            console.warn("DetectifAI speaker verification notice:", spkData.error);
            speakerDecision = "no_match";
            speakerSimilarity = 0;
            isSpeakerMatch = false;
          } else {
            speakerDecision = spkData.result?.decision || "no_match";
            speakerSimilarity = spkData.result?.similarity ?? -1;
            speakerThreshold = spkData.result?.threshold ?? 0.53;
            isSpeakerMatch = speakerDecision === "match" || speakerSimilarity >= speakerThreshold;
          }
        } catch (vErr) {
          console.warn("Speaker verify fetch error:", vErr);
          speakerDecision = "no_match";
          isSpeakerMatch = false;
        }
      } else {
        speakerDecision = "no_match";
        speakerSimilarity = 0;
        isSpeakerMatch = false;
      }
    }

    // ----------------------------------------------------
    // DECISION MATRIX (Zero-Trust Escrow Rules)
    // ----------------------------------------------------
    let scenarioCode: "SCENARIO_A" | "SCENARIO_B" | "SCENARIO_C" | "SCENARIO_D" | "SCENARIO_SOLO_AUDIO" | "SCENARIO_INSUFFICIENT_TOUR_SPEECH";
    let isEscrowUnlocked = false;
    let headline = "";
    let reason = "";
    let edgeCaseWarning: string | null = null;
    let badgeColor: "red" | "green" | "amber" = "red";

    if (eitherIsSynthetic) {
      // Scenario A: AI clone or synthetic speech detected on either/both streams
      scenarioCode = "SCENARIO_A";
      isEscrowUnlocked = false;
      badgeColor = "red";

      if (bothAreSynthetic) {
        headline = "Transaction Intercepted: Dual AI Synthetic Speech Detected";
        reason = `Synthetic voice signatures were detected on both the property walkthrough video (${(tourScore * 100).toFixed(1)}% AI confidence) and the WhatsApp deposit demand (${(noteScore * 100).toFixed(1)}% AI confidence). Both streams were generated with artificial voice synthesis. Deposit escrow remains locked.`;
      } else if (tourIsSynthetic) {
        headline = "Transaction Intercepted: Synthetic AI Voiceover on Property Tour";
        reason = `Synthetic artificial voice detected on the property walkthrough video (${(tourScore * 100).toFixed(1)}% AI confidence). The listing video was created with an AI voice generator. Deposit escrow remains locked.`;
      } else {
        headline = "Transaction Intercepted: Synthetic AI Voice Note Clone Detected";
        reason = `Synthetic voice signature detected on the WhatsApp voice demand with ${(noteScore * 100).toFixed(1)}% confidence. The voice note was generated by an AI voice cloning model. Deposit escrow remains locked.`;
      }
    } else if (!hasTour) {
      // Solo Audio Fallback: Voice is real human, but no tour video was provided!
      scenarioCode = "SCENARIO_SOLO_AUDIO";
      isEscrowUnlocked = false;
      badgeColor = "amber";
      headline = "Partial Verification: Natural Voice (No Walkthrough Provided)";
      reason = `Natural human speech confirmed on this WhatsApp voice note (${(noteScore * 100).toFixed(1)}% AI risk). However, because no property walkthrough video was uploaded, speaker identity cross-verification could not be performed. Deposit escrow remains locked by default.`;
      edgeCaseWarning = "Missing Property Walkthrough: Anyone can speak in a natural human voice while demanding deposits for an apartment they do not own. Always require a walkthrough video or use RentRakshak's Verified Directory.";
    } else if (!isSpeakerMatch && (!spkData.result?.decision || spkData.result.decision === "no_match") && spkData.result?.similarity === 0) {
      // Video audio could not be enrolled due to insufficient speech/ambient noise or short audio
      scenarioCode = "SCENARIO_INSUFFICIENT_TOUR_SPEECH";
      isEscrowUnlocked = false;
      badgeColor = "amber";
      headline = "Verification Inconclusive: Insufficient Speech in Walkthrough Video";
      reason = `The WhatsApp voice note contains natural human speech (${(noteScore * 100).toFixed(1)}% AI risk). However, the property walkthrough video did not contain enough clear spoken words to extract a reliable voiceprint. Without an enrolled voiceprint, RentRakshak cannot verify if the caller is the same person who filmed the apartment. Deposit escrow remains locked.`;
      edgeCaseWarning = "Inconclusive Video Voiceprint: RentRakshak requires at least 10s of audible speech in the walkthrough video. Ask the landlord to narrate the video clearly, or verify them via the Landlord Portal.";
    } else if (!isSpeakerMatch) {
      // Scenario B: Scammer human voice does not match video tour voice
      scenarioCode = "SCENARIO_B";
      isEscrowUnlocked = false;
      badgeColor = "red";
      headline = "Transaction Intercepted: Speaker Identity Mismatch";
      reason = `Both streams contain natural human speech, but voiceprint cross-verification failed. The person demanding the ₹15,000 deposit does NOT match the owner who narrated the property tour. Stolen listing scam intercepted.`;
      edgeCaseWarning = "Identity Mismatch Alert: A scammer is likely using someone else's real property video while demanding advance deposits from a separate phone.";
    } else {
      // Both Deepfake checks passed (Human) AND Speaker Biometric Matches!
      if (scenarioHint === "scenario_d") {
        // Scenario D: Genuine human voice matched on both (Dubbed listing edge case)
        scenarioCode = "SCENARIO_D";
        isEscrowUnlocked = true;
        badgeColor = "amber";
        headline = "Verified Genuine Owner (Dubbed Listing Review)";
        reason = `Natural human speech confirmed on both streams and speaker voiceprint matched. The caller on WhatsApp matches the narrator in the video tour.`;
        edgeCaseWarning = "Voice matched successfully. RentRakshak deposit escrow is protected until lease confirmation.";
      } else {
        // Scenario C: Genuine landlord
        scenarioCode = "SCENARIO_C";
        isEscrowUnlocked = true;
        badgeColor = "green";
        headline = "Verified Authentic Landlord";
        reason = `Speaker voiceprint cross-match confirmed and zero synthetic speech artifacts detected. The caller matches the authentic owner. Deposit escrow unlocked for safe transfer.`;
      }
    }

    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      decision: {
        scenarioCode,
        isEscrowUnlocked,
        badgeColor,
        headline,
        reason,
        edgeCaseWarning,
      },
      telemetry: {
        deepfake: {
          requestId: dfData.request_id || dfTourData.request_id,
          operationId: dfData.operation_id || dfTourData.operation_id,
          verdict: primaryVerdict,
          score: maxSyntheticScore,
          threshold: noteThreshold,
          label: dfData.result?.label,
          isSynthetic: eitherIsSynthetic,
          duration: dfData.result?.duration_seconds,
          segments: dfData.result?.segments || dfTourData.result?.segments || [],
          timings: dfData.result?.timings_ms,
        },
        deepfakeTour: {
          requestId: dfTourData.request_id,
          verdict: tourVerdict,
          score: tourScore,
          threshold: tourThreshold,
          isSynthetic: tourIsSynthetic,
          duration: dfTourData.result?.duration_seconds,
        },
        deepfakeNote: {
          requestId: dfData.request_id,
          verdict: noteVerdict,
          score: noteScore,
          threshold: noteThreshold,
          isSynthetic: noteIsSynthetic,
          duration: dfData.result?.duration_seconds,
        },
        speaker: {
          requestId: spkData.request_id,
          operationId: spkData.operation_id,
          speakerId,
          decision: speakerDecision,
          similarity: speakerSimilarity,
          threshold: speakerThreshold,
          duration: spkData.result?.duration_seconds,
          isMatch: isSpeakerMatch,
        },
        audit: {
          timestamp: new Date().toISOString(),
          totalLatencyMs,
          escrowGatewayStatus: isEscrowUnlocked ? "UNLOCKED" : "LOCKED_ZERO_TRUST",
          enrolledSpeakerId: speakerId,
          tourWasExtractedFromVideo: tourAudio?.wasConverted || false,
          noteWasExtractedFromVideo: noteAudio.wasConverted,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SubletShield verification error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal escrow gateway verification error: " + message,
      },
      { status: 500 }
    );
  }
}
