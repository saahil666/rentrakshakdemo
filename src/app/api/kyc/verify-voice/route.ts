import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { findLandlordById, saveLandlord, calculateGpsDistanceMeters } from "@/lib/db";
import { normalizeAudioWithFfmpeg } from "@/lib/audio";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audioFile") as File | null;
    const landlordId = formData.get("landlordId") as string | null;
    const propertyAddress = (formData.get("propertyAddress") as string) || "Koramangala 4th Block, Bangalore";
    const propertyLat = parseFloat((formData.get("propertyLat") as string) || "12.9352");
    const propertyLng = parseFloat((formData.get("propertyLng") as string) || "77.6245");
    const deviceLat = parseFloat((formData.get("deviceLat") as string) || "12.9351");
    const deviceLng = parseFloat((formData.get("deviceLng") as string) || "77.6244");
    const clientApiKey = formData.get("apiKey") as string | null;

    if (!audioFile || !landlordId) {
      return NextResponse.json(
        { success: false, error: "Audio declaration file and Landlord ID are required." },
        { status: 400 }
      );
    }

    const landlord = findLandlordById(landlordId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: "Landlord profile not found." }, { status: 404 });
    }

    // Step 1: GPS Geofence Verification (Strict 300m radius)
    const distanceMeters = calculateGpsDistanceMeters(deviceLat, deviceLng, propertyLat, propertyLng);
    const isGpsMatch = distanceMeters <= 300;

    if (!isGpsMatch) {
      const formattedDist = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(2)} km` : `${distanceMeters} meters`;
      return NextResponse.json({
        success: false,
        error: `GEOFENCE VIOLATION: Your device GPS is ${formattedDist} away from the pinned property location. SubletShield requires on-site verification (within 300m) to prevent remote fraudulent listings.`,
        distanceMeters,
      }, { status: 403 });
    }

    // Step 2: DetectifAI Deepfake Audio Check
    const apiKey = clientApiKey || process.env.DETECTIFAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "DetectifAI API Key not configured." }, { status: 500 });
    }

    // Normalize ANY audio/video format (.ogg, .opus, .m4a, .mp3, .webm, .wav) to clean 16kHz WAV
    const normalized = await normalizeAudioWithFfmpeg(audioFile, false);
    const audioBuffer = normalized.buffer;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" });

    const BASE_URL = "https://platform.detectif.ai/v1";
    const idempotencyKey = `kyc_df_${crypto.createHash("sha256").update(audioBuffer).digest("hex").slice(0, 24)}`;

    const dfFormData = new FormData();
    dfFormData.append("file", audioBlob, normalized.filename);

    const deepfakeResp = await fetch(`${BASE_URL}/deepfake/detect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: dfFormData,
    });

    const dfData = await deepfakeResp.json();

    if (dfData.error && dfData.error.code !== "idempotency_key_reuse") {
      console.warn("DetectifAI KYC Deepfake error:", dfData.error);
      return NextResponse.json(
        { success: false, error: "Deepfake verification failed: " + (dfData.error.message || "Unknown error") },
        { status: deepfakeResp.status || 400 }
      );
    }

    const verdict = dfData.result?.verdict || "real";
    const syntheticScore = dfData.result?.score ?? 0;
    const isSynthetic = dfData.result?.is_synthetic ?? (verdict === "fake" || syntheticScore >= 0.62);

    if (isSynthetic) {
      return NextResponse.json({
        success: false,
        error: `KYC ENROLLMENT REJECTED: Synthetic AI voice detected (${(syntheticScore * 100).toFixed(1)}% AI confidence). SubletShield strictly forbids AI clones or synthetic avatars for landlord onboarding.`,
        isSynthetic: true,
        telemetry: {
          verdict,
          score: syntheticScore,
        },
      }, { status: 422 });
    }

    // Step 3: Biometric Speaker Enrollment (Eidos)
    const speakerId = `landlord_${landlord.id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    const idempotencyEnroll = `kyc_enr_${crypto.createHash("sha256").update(audioBuffer).digest("hex").slice(0, 24)}`;

    const enrollFormData = new FormData();
    enrollFormData.append("speaker_id", speakerId);
    enrollFormData.append("file", audioBlob, normalized.filename);

    try {
      await fetch(`${BASE_URL}/speakers/enroll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": idempotencyEnroll,
        },
        body: enrollFormData,
      });
    } catch (enrollErr) {
      console.warn("Notice: Landlord voice enrollment:", enrollErr);
    }

    // Update Landlord verification status
    landlord.isVoiceVerified = true;
    landlord.isGpsVerified = isGpsMatch;
    landlord.isFullyVerified = Boolean(landlord.isEmailVerified || landlord.isPhoneVerified) && landlord.isAadhaarVerified && isGpsMatch;
    landlord.enrolledSpeakerId = speakerId;
    landlord.propertyCoordinates = {
      latitude: propertyLat,
      longitude: propertyLng,
      address: propertyAddress,
    };
    landlord.deviceGpsCoordinates = {
      latitude: deviceLat,
      longitude: deviceLng,
    };
    landlord.gpsDistanceMeters = distanceMeters;

    saveLandlord(landlord);

    return NextResponse.json({
      success: true,
      message: isGpsMatch
        ? "Landlord Identity & Voiceprint Verified Successfully!"
        : "Voice verified, but GPS location was outside property geofence.",
      isGpsMatch,
      distanceMeters,
      landlord,
      telemetry: {
        deepfake: {
          verdict,
          score: syntheticScore,
          isSynthetic: false,
        },
        enrolledSpeakerId: speakerId,
        geofence: {
          propertyLat,
          propertyLng,
          deviceLat,
          deviceLng,
          distanceMeters,
          isVerified: isGpsMatch,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("KYC Voice Error:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
