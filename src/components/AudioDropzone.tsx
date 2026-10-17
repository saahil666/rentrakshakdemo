"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Play,
  Pause,
  Mic,
  Square,
  FileAudio,
  Film,
  Video,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface AudioDropzoneProps {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor?: "cyan" | "indigo" | "rose" | "emerald";
  audioFile: File | null;
  audioUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  allowRecord?: boolean;
  minDurationText?: string;
  primaryUploadLabel?: string;
}

export const AudioDropzone: React.FC<AudioDropzoneProps> = ({
  id,
  title,
  subtitle,
  tag,
  audioFile,
  audioUrl,
  onFileSelect,
  onClear,
  allowRecord = false,
  minDurationText,
  primaryUploadLabel,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isVideoFile =
    audioFile?.type.startsWith("video/") ||
    audioFile?.name.toLowerCase().endsWith(".mp4") ||
    audioFile?.name.toLowerCase().endsWith(".mov") ||
    audioUrl?.includes(".mp4");

  // Update media source when audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl && !isVideoFile) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl, isVideoFile]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn("Playback error:", e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Live Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const recordedFile = new File([audioBlob], `recorded-voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        onFileSelect(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please grant permission in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4 sm:p-5 flex flex-col space-y-3.5 hover:border-white/[0.12] transition-all">
      <audio ref={audioRef} preload="metadata" />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/*,audio/*,.mp4,.mov,.m4a,.wav,.mp3,.webm,.ogg,.opus"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md badge-neutral">
              {tag}
            </span>
            <span className="text-xs font-semibold text-white tracking-tight">{title}</span>
          </div>
          <p className="text-[11px] text-zinc-400">{subtitle}</p>
        </div>

        {audioFile && (
          <button
            onClick={onClear}
            className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition px-2 py-1 rounded-md hover:bg-white/[0.05]"
            title="Replace media"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Replace</span>
          </button>
        )}
      </div>

      {/* Dropzone Area or Media Preview */}
      {!audioUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`h-32 rounded-2xl border border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-white/30 bg-white/[0.06] scale-[1.005]"
              : "border-white/10 bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.03]"
          }`}
        >
          {isRecording ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-medium text-rose-400">
                  Recording Live: {formatSeconds(recordingSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopRecording();
                }}
                className="px-3.5 py-1.5 rounded-full bg-white text-zinc-950 text-xs font-medium flex items-center gap-1.5 shadow hover:bg-zinc-200 transition"
              >
                <Square className="w-3 h-3" /> Stop &amp; Save
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-300">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-white text-zinc-950 text-xs font-medium shadow-sm hover:bg-zinc-200 inline-flex items-center gap-1.5 transition mb-1"
                >
                  <span>{primaryUploadLabel || "Upload Media File"}</span>
                </button>
                <div className="text-[11px] text-zinc-500">
                  or drag and drop here
                </div>
              </div>
              {minDurationText && (
                <div className="text-[10px] text-zinc-500 font-normal">
                  {minDurationText}
                </div>
              )}
            </div>
          )}
        </div>
      ) : isVideoFile ? (
        /* Video Player Preview for MP4 files */
        <div className="rounded-2xl bg-zinc-950/80 border border-white/10 overflow-hidden p-2 flex flex-col space-y-2">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-44 w-full">
            <video
              ref={videoRef}
              src={audioUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between px-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 truncate">
              <Film className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="font-medium truncate">{audioFile?.name || "Uploaded Walkthrough Video (.MP4)"}</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              Audio Extracted
            </span>
          </div>
        </div>
      ) : (
        /* Audio Player Bar */
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 sm:p-3.5 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center transition shrink-0 hover:bg-zinc-200 shadow-sm"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              <div className="truncate">
                <div className="text-xs font-medium text-zinc-200 truncate flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{audioFile?.name || "Audio Track"}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {formatSeconds(currentTime)} / {formatSeconds(duration || 0)}
                </div>
              </div>
            </div>

            {/* Apple-style Monochrome Animated Waveform Bars */}
            <div className="flex items-center gap-1 h-5 px-2">
              {[40, 70, 30, 90, 60, 80, 45, 95, 35, 75, 55, 85].map((h, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying ? "bg-white" : "bg-zinc-700"
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(20, (h * (Math.sin(currentTime * 5 + i) + 1.2)) / 2)}%` : `${h * 0.35}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Time Scrubber */}
          <div className="flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      )}

      {/* Record Mic Button if allowed */}
      {allowRecord && !audioUrl && !isRecording && (
        <div className="flex justify-center pt-0.5">
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[11px] font-medium border border-white/10 transition"
          >
            <Mic className="w-3 h-3 text-zinc-400" />
            <span>Or Record Live via Microphone</span>
          </button>
        </div>
      )}
    </div>
  );
};
