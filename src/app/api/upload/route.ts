import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = "/opt/homebrew/bin/ffmpeg";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadedFiles: File[] = [];

    // Collect all files from formData (supports "file", "photos", "video", etc.)
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        uploadedFiles.push(value);
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided in upload request." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "properties");
    await fs.mkdir(uploadDir, { recursive: true });

    const results = [];

    for (const file of uploadedFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalName = file.name || "upload.bin";
      const ext = path.extname(originalName).toLowerCase() || (file.type.startsWith("video/") ? ".mp4" : ".jpg");
      const isVideo = file.type.startsWith("video/") || [".mp4", ".mov", ".webm", ".mkv", ".avi"].includes(ext);

      const uniquePrefix = isVideo ? "prop_vid" : "prop_img";
      const fileId = `${uniquePrefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const savedFileName = `${fileId}${ext}`;
      const savedFilePath = path.join(uploadDir, savedFileName);

      await fs.writeFile(savedFilePath, buffer);
      const publicUrl = `/uploads/properties/${savedFileName}`;

      let audioUrl: string | undefined = undefined;

      // If it's a video file, automatically extract 16kHz PCM WAV audio for DetectifAI
      if (isVideo) {
        const audioFileName = `${fileId}_audio.wav`;
        const audioFilePath = path.join(uploadDir, audioFileName);
        try {
          await execFileAsync(FFMPEG_PATH, [
            "-y",
            "-i",
            savedFilePath,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            audioFilePath,
          ]);
          audioUrl = `/uploads/properties/${audioFileName}`;
        } catch (ffmpegErr) {
          console.warn("Notice: Could not extract audio track from video:", ffmpegErr);
        }
      }

      results.push({
        url: publicUrl,
        audioUrl,
        name: originalName,
        type: isVideo ? "video" : "image",
        size: buffer.length,
      });
    }

    return NextResponse.json({
      success: true,
      files: results,
      primaryUrl: results[0]?.url,
      audioUrl: results.find((r) => r.audioUrl)?.audioUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: "Upload failed: " + msg },
      { status: 500 }
    );
  }
}
