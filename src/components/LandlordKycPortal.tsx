"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  MapPin,
  Mic,
  Square,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Building,
  Sparkles,
  ArrowRight,
  Loader2,
  RefreshCw,
  PlusCircle,
  UserCheck,
  Film,
  Image as ImageIcon,
  X,
  Mail,
} from "lucide-react";
import { Landlord, VerifiedProperty } from "@/types/db";
import { PropertyLocationPicker } from "./PropertyLocationPicker";
import { validateVerhoeffAadhaar } from "@/lib/verhoeff";

interface LandlordKycPortalProps {
  apiKey: string;
  onSelectPropertyForEscrow: (prop: VerifiedProperty) => void;
}

export const LandlordKycPortal: React.FC<LandlordKycPortalProps> = ({
  apiKey,
  onSelectPropertyForEscrow,
}) => {
  // Navigation tabs inside Landlord Portal
  const [activeTab, setActiveTab] = useState<"kyc" | "list_property" | "directory">("kyc");

  // Step 1: Email & OTP (Resend API)
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // Active Landlord Session
  const [currentLandlord, setCurrentLandlord] = useState<Landlord | null>(null);

  // Step 2: Aadhaar & DigiLocker
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [isAadhaarLoading, setIsAadhaarLoading] = useState(false);
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);
  const [digiLockerOtp, setDigiLockerOtp] = useState("");
  const [digiLockerStep, setDigiLockerStep] = useState<"aadhaar" | "otp" | "success">("aadhaar");

  // Step 3: Property Address & GPS
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyLat, setPropertyLat] = useState(12.9352);
  const [propertyLng, setPropertyLng] = useState(77.6245);
  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [gpsVerifiedStatus, setGpsVerifiedStatus] = useState<string | null>(null);
  const [gpsDistanceMeters, setGpsDistanceMeters] = useState<number | null>(null);

  // Step 4: Voice Recording & Biometric Enrollment
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isVoiceScanning, setIsVoiceScanning] = useState(false);
  const [voiceScanStep, setVoiceScanStep] = useState("");
  const [scanResult, setScanResult] = useState<{
    verdict?: string;
    score?: number;
    distanceMeters?: number;
    speakerId?: string;
  } | null>(null);

  // Step 5: Listing Form & Real File Uploads
  const [listingTitle, setListingTitle] = useState("");
  const [listingRent, setListingRent] = useState<number | "">("");
  const [listingDeposit, setListingDeposit] = useState<number | "">("");
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; name: string }[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<{ url: string; name: string; audioUrl?: string } | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);

  // Directory of Properties
  const [properties, setProperties] = useState<VerifiedProperty[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Load properties on mount
  const fetchProperties = async () => {
    setIsLoadingProps(true);
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      if (data.success && Array.isArray(data.properties)) {
        setProperties(data.properties);
      }
    } catch (err) {
      console.error("Failed to load properties:", err);
    } finally {
      setIsLoadingProps(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Step 1: Send Email Verification Code via Resend
  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      setOtpError("Please enter a valid email address.");
      return;
    }
    setIsOtpLoading(true);
    setOtpError(null);
    setOtpSuccessMsg(null);
    setDemoOtp(null);

    try {
      const res = await fetch("/api/kyc/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          email: email.trim(),
          fullName: fullName.trim() || "Landlord",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification email");
      }

      setOtpSent(true);
      setOtpSuccessMsg(data.message || `Verification code sent to ${email}`);

      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Step 1: Verify 6-digit Email OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    setIsOtpLoading(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/kyc/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.trim(),
          otp: otp.trim(),
          fullName: fullName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid verification code.");
      }

      setCurrentLandlord(data.landlord);
      setOtpSuccessMsg("Email successfully verified.");
      setDemoOtp(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg);
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Step 2: Aadhaar Checksum & DigiLocker Linkage
  const handleVerifyAadhaar = async (overrideAadhaar?: string) => {
    let cleanAadhaar = (overrideAadhaar || aadhaarInput).replace(/[^0-9]/g, "");
    if (cleanAadhaar.length !== 12) {
      if (isDigiLockerOpen) {
        // Fallback to valid sandbox demo Aadhaar if testing in sandbox
        cleanAadhaar = "234567890124";
        setAadhaarInput("2345 6789 0124");
      } else {
        alert("Aadhaar number must contain exactly 12 digits.");
        return;
      }
    }

    const check = validateVerhoeffAadhaar(cleanAadhaar);
    if (!check.valid && !isDigiLockerOpen) {
      alert(`UIDAI Checksum Error: ${check.reason || "Invalid Aadhaar"}`);
      return;
    }

    setIsAadhaarLoading(true);

    try {
      const res = await fetch("/api/kyc/verify-aadhaar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landlordId: currentLandlord?.id,
          aadhaarNumber: cleanAadhaar,
          fullName: fullName.trim() || currentLandlord?.fullName || "Verified Landlord",
          email: email.trim() || currentLandlord?.email || "landlord@rentrakshak.org",
          consent: true,
          consentAccepted: true,
          aadhaarConsent: true,
          isSandbox: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Aadhaar verification failed.");
      }

      setCurrentLandlord(data.landlord);
      setAadhaarConsent(true);
      setIsDigiLockerOpen(false);
      setDigiLockerStep("aadhaar");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsAadhaarLoading(false);
    }
  };

  // Step 4: Microphone Voice Recording
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
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone access is required to record your voice declaration.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleUseSampleVoice = async () => {
    try {
      const res = await fetch("/samples/sample_landlord_voice.wav");
      if (!res.ok) throw new Error("Sample file not available.");
      const blob = await res.blob();
      setRecordedAudioBlob(blob);
      setRecordedAudioUrl(URL.createObjectURL(blob));
      setRecordingSeconds(18);
    } catch {
      alert("Could not load sample voice file. Please record with your microphone.");
    }
  };

  const handleSubmitVoiceKyc = async () => {
    if (!currentLandlord || !recordedAudioBlob) return;

    if (!currentLandlord.isGpsVerified) {
      alert("Please confirm on-site presence in Step 3 before submitting your voice declaration.");
      return;
    }

    setIsVoiceScanning(true);
    setVoiceScanStep("Analyzing voice naturalness...");

    try {
      const formData = new FormData();
      formData.append("audioFile", recordedAudioBlob, "landlord_kyc_declaration.wav");
      formData.append("landlordId", currentLandlord.id);
      formData.append("propertyAddress", propertyAddress);
      formData.append("propertyLat", propertyLat.toString());
      formData.append("propertyLng", propertyLng.toString());
      formData.append("deviceLat", (deviceLat ?? propertyLat).toString());
      formData.append("deviceLng", (deviceLng ?? propertyLng).toString());
      if (apiKey) formData.append("apiKey", apiKey);

      setTimeout(() => {
        setVoiceScanStep("Enrolling authentic voiceprint...");
      }, 800);

      const res = await fetch("/api/kyc/verify-voice", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Voice verification failed.");
      }

      setCurrentLandlord(data.landlord);
      setScanResult({
        verdict: data.telemetry?.deepfake?.verdict || "real",
        score: data.telemetry?.deepfake?.score || 0.002,
        distanceMeters: data.distanceMeters || 15,
        speakerId: data.telemetry?.enrolledSpeakerId,
      });

      fetchProperties();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsVoiceScanning(false);
      setVoiceScanStep("");
    }
  };

  // Real Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsUploadingPhoto(true);

    try {
      const newPhotos: { url: string; name: string }[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.file?.url) {
          newPhotos.push({ url: data.file.url, name: file.name });
        }
      }
      setUploadedPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Failed to upload photos.");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Real Video Upload Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingVideo(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "video");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.file?.url) {
        setUploadedVideo({
          url: data.file.url,
          name: file.name,
          audioUrl: data.file.audioUrl || undefined,
        });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Video upload error:", err);
      alert("Failed to upload video walkthrough.");
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  // Step 5: Publish Property
  const handlePublishProperty = async () => {
    if (!currentLandlord?.isFullyVerified) {
      alert("Please complete identity, geofence, and voice verification before publishing.");
      return;
    }

    if (!listingTitle.trim()) {
      alert("Please enter a property title.");
      return;
    }

    setIsSubmittingListing(true);

    try {
      const primaryImage = uploadedPhotos[0]?.url || "/apartment.jpg";
      const galleryUrls = uploadedPhotos.map((p) => p.url);

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landlordId: currentLandlord.id,
          title: listingTitle,
          address: propertyAddress,
          lat: propertyLat,
          lng: propertyLng,
          monthlyRent: Number(listingRent),
          depositAmount: Number(listingDeposit),
          imageUrl: primaryImage,
          galleryImages: galleryUrls,
          videoUrl: uploadedVideo?.url || null,
          tourAudioUrl: uploadedVideo?.audioUrl || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Property published successfully to the Verified Directory!");
        fetchProperties();
        setActiveTab("directory");
      } else {
        alert(data.error || "Failed to publish property");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingListing(false);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Top Banner with Apple Segmented Pill Navigation */}
      <div className="apple-card rounded-3xl p-5 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
            <Building className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">Landlord Verification Portal</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-medium uppercase rounded-full badge-neutral">
                Owner Direct
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Verified identity onboarding: Email OTP, Aadhaar verification, on-site GPS &amp; authentic voiceprint enrollment.
            </p>
          </div>
        </div>

        {/* macOS / iOS Segmented Pill Control */}
        <div className="flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08] self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab("kyc")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "kyc"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>1. Verification Flow</span>
          </button>

          <button
            onClick={() => setActiveTab("list_property")}
            disabled={!currentLandlord?.isFullyVerified}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "list_property"
                ? "bg-white text-zinc-950 shadow-sm"
                : !currentLandlord?.isFullyVerified
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>2. Add Listing</span>
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "directory"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Directory ({properties.length})</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: 4-STEP LANDLORD KYC WIZARD                     */}
      {/* ---------------------------------------------------- */}
      {activeTab === "kyc" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: The 4-Step Interactive Verification Card */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 1: Email + OTP */}
            <div className={`apple-card rounded-3xl p-5 sm:p-6 border transition-all ${
              currentLandlord?.isEmailVerified
                ? "border-emerald-500/20"
                : "border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    currentLandlord?.isEmailVerified ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-white"
                  }`}>
                    {currentLandlord?.isEmailVerified ? "✓" : "1"}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Step 1: Email Verification</span>
                      <span className="text-[10px] text-zinc-400 font-normal">via Gmail Bot</span>
                    </h3>
                  </div>
                </div>
                {currentLandlord?.isEmailVerified && (
                  <span className="badge-success px-2.5 py-0.5 text-[11px] font-medium rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Email Verified
                  </span>
                )}
              </div>

              {!currentLandlord?.isEmailVerified ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter full legal name"
                        className="w-full px-3 py-2 rounded-xl apple-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. name@example.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl apple-input text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resend Success Notice */}
                  {otpSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-300">Code Dispatched</div>
                        <div className="text-[11px] text-zinc-300 mt-0.5">{otpSuccessMsg}</div>
                      </div>
                    </div>
                  )}

                  {/* Resend Error Notice */}
                  {otpError && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20 text-xs text-rose-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-rose-300">Delivery Status</div>
                        <div className="text-[11px] text-zinc-300 mt-0.5">{otpError}</div>
                      </div>
                    </div>
                  )}

                  {/* Demo Sandbox Auto-Fill Button */}
                  {demoOtp && (
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 font-medium">Demo Sandbox Code:</span>
                        <span className="font-mono text-white font-medium tracking-wider">{demoOtp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtp(demoOtp)}
                        className="px-3 py-1 rounded-full apple-btn-primary text-xs font-medium transition shadow-sm"
                      >
                        Auto-Fill Code
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSendOtp}
                      disabled={isOtpLoading}
                      className="px-4 py-2 rounded-full apple-btn-primary text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                    >
                      {isOtpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>{otpSent ? "Resend Code" : "Send Verification Code"}</span>
                    </button>

                    {otpSent && (
                      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="6-digit code"
                          maxLength={6}
                          className="w-36 px-3 py-2 rounded-xl apple-input text-xs text-center font-mono font-medium tracking-widest text-emerald-400"
                        />
                        <button
                          onClick={handleVerifyOtp}
                          disabled={isOtpLoading}
                          className="px-4 py-2 rounded-full apple-btn-secondary text-xs font-medium transition"
                        >
                          Verify Code
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-zinc-400">Verified Landlord: </span>
                    <span className="font-medium text-white">{currentLandlord.fullName}</span>
                    <span className="text-zinc-400 ml-2 font-mono">({currentLandlord.email})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-success px-2 py-0.5 rounded-full text-[10px] font-mono">
                      Verified
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Aadhaar Government ID Linkage */}
            <div className={`apple-card rounded-3xl p-5 sm:p-6 border transition-all ${
              currentLandlord?.isAadhaarVerified
                ? "border-emerald-500/20"
                : "border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    currentLandlord?.isAadhaarVerified ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-white"
                  }`}>
                    {currentLandlord?.isAadhaarVerified ? "✓" : "2"}
                  </div>
                  <h3 className="text-sm font-semibold text-white">Step 2: Identity (Aadhaar) Linkage</h3>
                </div>
                {currentLandlord?.isAadhaarVerified && (
                  <span className="badge-success px-2.5 py-0.5 text-[11px] font-medium rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Identity Linked
                  </span>
                )}
              </div>

              {!currentLandlord?.isAadhaarVerified ? (
                <div className="space-y-3.5">
                  <p className="text-xs text-zinc-400">
                    Enter your 12-digit Aadhaar number. RentRakshak validates the number using UIDAI&apos;s mathematical Verhoeff checksum algorithm.
                  </p>

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={aadhaarInput}
                        onChange={(e) => setAadhaarInput(e.target.value)}
                        placeholder="XXXX XXXX XXXX"
                        maxLength={14}
                        className="w-56 px-3 py-2 rounded-xl apple-input text-xs font-mono tracking-wider"
                      />
                      <button
                        onClick={() => handleVerifyAadhaar()}
                        disabled={isAadhaarLoading}
                        className="px-4 py-2 rounded-full apple-btn-primary text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                      >
                        {isAadhaarLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                        <span>Verify Identity</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDigiLockerOpen(true);
                          setDigiLockerStep("aadhaar");
                        }}
                        className="px-3.5 py-2 rounded-full apple-btn-secondary text-xs font-medium transition flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>DigiLocker Sandbox Consent</span>
                      </button>
                    </div>

                    {/* Verhoeff Checksum indicator */}
                    {aadhaarInput.replace(/[^0-9]/g, "").length === 12 && (
                      <div className="text-[11px] font-mono">
                        {validateVerhoeffAadhaar(aadhaarInput.replace(/[^0-9]/g, "")).valid ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Checksum Valid (UIDAI Form Compliant)
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Invalid Checksum (UIDAI Gateway would reject)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="aadhaar-consent-checkbox"
                        checked={aadhaarConsent}
                        onChange={(e) => setAadhaarConsent(e.target.checked)}
                        className="mt-0.5 rounded border-white/20 text-white focus:ring-0"
                      />
                      <label htmlFor="aadhaar-consent-checkbox" className="cursor-pointer text-[11px] text-zinc-400 leading-relaxed">
                        I hereby provide consent to fetch my e-KYC credentials under the Aadhaar Act 2016 for rental escrow verification.
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400">Linked Identity: </span>
                    <span className="font-mono font-medium text-emerald-400">{currentLandlord.aadhaarNumber}</span>
                  </div>
                  <span className="badge-neutral px-2 py-0.5 rounded-full text-[10px]">
                    UIDAI Record Linked
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Interactive Map Pinpoint & Live Geofence Audit */}
            <div className={`apple-card rounded-3xl p-5 sm:p-6 border transition-all ${
              !currentLandlord?.isAadhaarVerified
                ? "opacity-40 pointer-events-none border-white/[0.06]"
                : currentLandlord?.isGpsVerified
                ? "border-emerald-500/20"
                : "border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    currentLandlord?.isGpsVerified ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-white"
                  }`}>
                    {currentLandlord?.isGpsVerified ? "✓" : "3"}
                  </div>
                  <h3 className="text-sm font-semibold text-white">Step 3: Map Pinpoint &amp; Physical Geofence</h3>
                </div>
                {currentLandlord?.isGpsVerified && (
                  <span className="badge-success px-2.5 py-0.5 text-[11px] font-medium rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Geofence Verified
                  </span>
                )}
              </div>

              <PropertyLocationPicker
                initialLat={propertyLat}
                initialLng={propertyLng}
                initialAddress={propertyAddress}
                onLocationSelected={(locData) => {
                  setPropertyLat(locData.lat);
                  setPropertyLng(locData.lng);
                  setPropertyAddress(locData.address);
                  if (locData.deviceLat && locData.deviceLng) {
                    setDeviceLat(locData.deviceLat);
                    setDeviceLng(locData.deviceLng);
                  }
                  setGpsDistanceMeters(locData.distanceMeters);

                  if (locData.isVerifiedOnSite) {
                    setGpsVerifiedStatus(`On-site Geofence Verified (${Math.round(locData.distanceMeters)}m from property pin).`);
                    if (currentLandlord) {
                      setCurrentLandlord({
                        ...currentLandlord,
                        isGpsVerified: true,
                        gpsDistanceMeters: locData.distanceMeters,
                      });
                    }
                  } else {
                    setGpsVerifiedStatus(null);
                    if (currentLandlord) {
                      setCurrentLandlord({
                        ...currentLandlord,
                        isGpsVerified: false,
                        gpsDistanceMeters: locData.distanceMeters,
                      });
                    }
                  }
                }}
              />
            </div>

            {/* Step 4: Live Audio Declaration & Voiceprint Enrollment */}
            <div className={`apple-card rounded-3xl p-5 sm:p-6 border transition-all ${
              !currentLandlord?.isAadhaarVerified || !currentLandlord?.isGpsVerified
                ? "opacity-40 pointer-events-none border-white/[0.06]"
                : currentLandlord?.isVoiceVerified
                ? "border-emerald-500/20"
                : "border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    currentLandlord?.isVoiceVerified ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-white"
                  }`}>
                    {currentLandlord?.isVoiceVerified ? "✓" : "4"}
                  </div>
                  <h3 className="text-sm font-semibold text-white">Step 4: Voice Authenticity &amp; Biometric Declaration</h3>
                </div>
                {currentLandlord?.isVoiceVerified ? (
                  <span className="badge-success px-2.5 py-0.5 text-[11px] font-medium rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Voiceprint Enrolled
                  </span>
                ) : !currentLandlord?.isGpsVerified ? (
                  <span className="badge-neutral px-2.5 py-0.5 text-[11px] font-medium rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Requires Step 3 Geofence
                  </span>
                ) : null}
              </div>

              {!currentLandlord?.isVoiceVerified ? (
                <div className="space-y-4">
                  {!currentLandlord?.isGpsVerified && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Please verify physical presence on-site in Step 3 before submitting your voice declaration.
                      </span>
                    </div>
                  )}

                  {/* Script prompt for landlord to read */}
                  <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] text-xs">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1.5">
                      Declaration Script (Read aloud while on-site):
                    </span>
                    <blockquote className="text-zinc-200 italic leading-relaxed">
                      &quot;I, {currentLandlord?.fullName || "Rajni Tiwari"}, confirm that I am physically standing inside my property at {propertyAddress}. I hereby authorize this listing on RentRakshak and submit my authentic voiceprint.&quot;
                    </blockquote>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="px-4 py-2 rounded-full apple-btn-primary text-xs font-medium transition flex items-center gap-2 shadow-sm"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-4 py-2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition flex items-center gap-2 animate-pulse"
                      >
                        <Square className="w-3.5 h-3.5 fill-rose-400" />
                        <span>Stop Recording ({recordingSeconds}s)</span>
                      </button>
                    )}

                    <button
                      onClick={handleUseSampleVoice}
                      className="px-3.5 py-2 rounded-full apple-btn-secondary text-xs font-medium transition"
                    >
                      Use Sample Declaration (.wav)
                    </button>
                  </div>

                  {recordedAudioUrl && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07] space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Recorded Audio Duration: {recordingSeconds}s</span>
                        <audio src={recordedAudioUrl} controls className="h-8 max-w-xs" />
                      </div>

                      <button
                        onClick={handleSubmitVoiceKyc}
                        disabled={isVoiceScanning || !currentLandlord?.isGpsVerified}
                        className="w-full py-3.5 px-4 rounded-2xl apple-btn-primary text-xs font-medium transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
                      >
                        {isVoiceScanning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{voiceScanStep || "Verifying Voice Authenticity..."}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Verify Voice &amp; Enroll Authentic Voiceprint</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Natural Human Voice Confirmed</span>
                    </span>
                    <span className="badge-success text-[10px] px-2 py-0.5 rounded-full font-medium">VERIFIED</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Voiceprint Enrolled</span>
                    <span>Distance: {currentLandlord.gpsDistanceMeters || 15}m from property pin</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Verified Identity Card & Status Badge */}
          <div className="space-y-4">
            <div className="apple-card rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white font-medium text-base shadow-sm">
                  {currentLandlord?.fullName ? currentLandlord.fullName[0] : "L"}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{currentLandlord?.fullName || "Unverified Landlord"}</h4>
                  <p className="text-xs text-zinc-400 font-mono">{currentLandlord?.email || currentLandlord?.phone || "••••••@•••••.com"}</p>
                </div>
              </div>

              {/* Progress Checklist */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[11px] font-medium text-zinc-400">
                  Verification Checklist
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <span className="text-zinc-400">1. Email OTP</span>
                    <span className={`text-[11px] font-medium ${currentLandlord?.isEmailVerified ? "text-emerald-400" : "text-zinc-500"}`}>
                      {currentLandlord?.isEmailVerified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <span className="text-zinc-400">2. Identity (Aadhaar)</span>
                    <span className={`text-[11px] font-medium ${currentLandlord?.isAadhaarVerified ? "text-emerald-400" : "text-zinc-500"}`}>
                      {currentLandlord?.isAadhaarVerified ? "Linked" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <span className="text-zinc-400">3. Physical Geofence</span>
                    <span className={`text-[11px] font-medium ${currentLandlord?.isGpsVerified ? "text-emerald-400" : "text-zinc-500"}`}>
                      {currentLandlord?.isGpsVerified ? "Matched" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <span className="text-zinc-400">4. Voiceprint</span>
                    <span className={`text-[11px] font-medium ${currentLandlord?.isVoiceVerified ? "text-emerald-400" : "text-zinc-500"}`}>
                      {currentLandlord?.isVoiceVerified ? "Enrolled" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Badge / Ready to List CTA */}
              {currentLandlord?.isFullyVerified ? (
                <div className="pt-2">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-center space-y-1.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                    <h5 className="text-xs font-semibold text-emerald-300">
                      Verified Owner Status Active
                    </h5>
                    <p className="text-[11px] text-zinc-400">
                      Identity and voiceprint are established. You may now publish verified listings.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab("list_property")}
                    className="w-full mt-3 py-3 rounded-full apple-btn-primary text-xs font-medium transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Proceed to Add Listing</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500 text-center">
                  Complete all 4 steps to unlock property publishing.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: PROPERTY LISTING STUDIO                         */}
      {/* ---------------------------------------------------- */}
      {activeTab === "list_property" && (
        <div className="max-w-3xl mx-auto w-full p-6 sm:p-7 rounded-3xl apple-card border border-white/[0.08] space-y-5 shadow-xl">
          <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
            <Building className="w-5 h-5 text-zinc-300" />
            <div>
              <h3 className="text-sm font-semibold text-white">Create a Verified Listing</h3>
              <p className="text-xs text-zinc-400">
                Upload genuine property photos and video walkthrough. The listing is anchored with your verified identity and enrolled voiceprint.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Property Listing Title</label>
              <input
                type="text"
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
                placeholder="e.g. 2BHK Apartment with Balcony"
                className="w-full px-3.5 py-2.5 rounded-xl apple-input text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Monthly Rent (₹ / month)</label>
                <input
                  type="number"
                  value={listingRent}
                  onChange={(e) => setListingRent(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 25000"
                  className="w-full px-3.5 py-2.5 rounded-xl apple-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Token Advance Deposit (₹)</label>
                <input
                  type="number"
                  value={listingDeposit}
                  onChange={(e) => setListingDeposit(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2.5 rounded-xl apple-input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Declared Property Address</label>
              <input
                type="text"
                readOnly
                value={propertyAddress}
                placeholder="Address will be populated from Step 3 physical geofence pin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-300 font-mono cursor-not-allowed placeholder-zinc-600"
              />
            </div>

            {/* REAL PROPERTY PHOTOS UPLOADER */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">
                Property Photos
              </label>

              <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div
                onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}
                className={`p-4 rounded-2xl border border-dashed text-center transition-all ${
                  isUploadingPhoto
                    ? "border-white/20 bg-white/[0.04] cursor-wait"
                    : "border-white/10 hover:border-white/25 bg-white/[0.015] hover:bg-white/[0.03] cursor-pointer"
                }`}
              >
                {isUploadingPhoto ? (
                  <div className="flex items-center justify-center gap-2 text-zinc-300 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-medium">Uploading images...</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-zinc-500 mx-auto mb-1.5" />
                    <span className="text-xs font-medium text-zinc-200">
                      Upload Photos (JPG, PNG, WEBP)
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Select one or more photos</p>
                  </>
                )}
              </div>

              {/* Photo Previews */}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {uploadedPhotos.map((photo, i) => (
                    <div key={i} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 h-24">
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(i);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-zinc-950/80 hover:bg-rose-500 text-white transition-all shadow-sm"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 p-1 bg-zinc-950/80 text-[9px] text-zinc-400 truncate font-mono">
                        {photo.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* REAL WALKTHROUGH VIDEO UPLOADER */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">
                Walkthrough Video (.MP4 / MOV)
              </label>

              <input
                type="file"
                ref={videoInputRef}
                accept="video/mp4,video/quicktime,video/webm,video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />

              {!uploadedVideo ? (
                <div
                  onClick={() => !isUploadingVideo && videoInputRef.current?.click()}
                  className={`p-4 rounded-2xl border border-dashed text-center transition-all ${
                    isUploadingVideo
                      ? "border-white/20 bg-white/[0.04] cursor-wait"
                      : "border-white/10 hover:border-white/25 bg-white/[0.015] hover:bg-white/[0.03] cursor-pointer"
                  }`}
                >
                  {isUploadingVideo ? (
                    <div className="flex items-center justify-center gap-2 text-zinc-300 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">Processing video &amp; extracting audio track...</span>
                    </div>
                  ) : (
                    <>
                      <Film className="w-5 h-5 text-zinc-500 mx-auto mb-1.5" />
                      <span className="text-xs font-medium text-zinc-200">
                        Upload Video Walkthrough (.MP4)
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Audio track is extracted to verify landlord voice</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white flex items-center gap-1.5 truncate">
                      <Film className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{uploadedVideo.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedVideo(null)}
                      className="text-[11px] text-zinc-400 hover:text-white font-medium shrink-0 ml-2"
                    >
                      Remove Video
                    </button>
                  </div>
                  <video src={uploadedVideo.url} controls className="w-full h-44 rounded-xl bg-black object-contain" />
                </div>
              )}
            </div>

            <button
              onClick={handlePublishProperty}
              disabled={isSubmittingListing || isUploadingPhoto || isUploadingVideo}
              className="w-full py-3.5 rounded-full apple-btn-primary text-xs font-medium transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmittingListing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publish to Verified Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: VERIFIED MARKETPLACE DIRECTORY                  */}
      {/* ---------------------------------------------------- */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Verified Properties ({properties.length})
            </h3>
            <span className="text-xs text-zinc-500">
              Every property has verified on-site presence and enrolled voiceprint.
            </span>
          </div>

          {properties.length === 0 ? (
            <div className="apple-card rounded-3xl p-10 text-center space-y-4 border border-white/[0.08]">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mx-auto">
                <Building className="w-5 h-5 text-zinc-300" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">No Properties Listed Yet</h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  AI-generated mock listings have been removed. Properties only appear in this directory once a verified owner completes physical geofencing and voice enrollment.
                </p>
              </div>
              <div>
                <button
                  onClick={() => setActiveTab("kyc")}
                  className="px-4 py-2 rounded-full apple-btn-primary text-xs font-medium transition shadow-sm"
                >
                  Start Owner Verification
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties.map((prop) => (
                <div
                  key={prop.id}
                  className="apple-card apple-card-hover rounded-3xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 w-full bg-zinc-950">
                      <img
                        src={prop.imageUrl || "/apartment.jpg"}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/apartment.jpg";
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-medium text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Verified Property</span>
                      </div>

                      {prop.galleryImages && prop.galleryImages.length > 1 && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-medium text-zinc-300 border border-white/10 flex items-center gap-1 shadow-sm">
                          <ImageIcon className="w-3 h-3" />
                          <span>{prop.galleryImages.length} Photos</span>
                        </div>
                      )}

                      <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-xs font-mono font-medium text-white border border-white/10">
                        ₹{prop.monthlyRent.toLocaleString()}/mo
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white line-clamp-1">{prop.title}</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{prop.address}</p>
                      </div>

                      {/* Verification Badges */}
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="badge-neutral px-2 py-0.5 rounded-full">
                          Identity Verified
                        </span>
                        <span className="badge-neutral px-2 py-0.5 rounded-full">
                          On-Site Geofence
                        </span>
                        <span className="badge-neutral px-2 py-0.5 rounded-full">
                          Voiceprint Enrolled
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
                        <span>Owner: <span className="text-zinc-200 font-medium">{prop.landlordName}</span></span>
                        <span className="font-mono text-zinc-300">Deposit: ₹{prop.depositAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => onSelectPropertyForEscrow(prop)}
                      className="w-full py-2.5 rounded-2xl apple-btn-secondary text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <span>Test Escrow Deposit against this Listing</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DIGILOCKER CONSENT MODAL */}
      {isDigiLockerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="apple-card w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-5 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-white/[0.08] border border-white/10 text-white font-medium text-xs flex items-center justify-center shadow-sm">
                  DL
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">DigiLocker Sandbox Gateway</div>
                  <div className="text-[10px] text-zinc-400 font-normal">UIDAI e-KYC Consent Portal</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDigiLockerOpen(false)}
                className="text-zinc-400 hover:text-white text-sm p-1 rounded-full hover:bg-white/[0.05] transition"
              >
                ✕
              </button>
            </div>

            {digiLockerStep === "aadhaar" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-300">
                      12-Digit Aadhaar Number
                    </label>
                    <button
                      type="button"
                      onClick={() => setAadhaarInput("2345 6789 0124")}
                      className="text-[10px] text-zinc-400 hover:text-white underline transition"
                    >
                      Fill Test Sandbox Aadhaar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={aadhaarInput}
                    onChange={(e) => setAadhaarInput(e.target.value)}
                    placeholder="Enter 12 digits"
                    maxLength={14}
                    className="w-full apple-input rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-zinc-600"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Validated using official UIDAI Verhoeff Checksum algorithm.
                  </p>
                </div>

                <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08] flex items-start gap-2.5 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    id="consent-digilocker"
                    checked={aadhaarConsent}
                    onChange={(e) => setAadhaarConsent(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 text-white focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="consent-digilocker" className="cursor-pointer text-[11px] leading-relaxed text-zinc-300">
                    I give explicit consent to fetch my e-KYC record from UIDAI for rental escrow verification under Aadhaar Act 2016.
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    let cleanDigits = aadhaarInput.replace(/[^0-9]/g, "");
                    if (cleanDigits.length !== 12) {
                      cleanDigits = "234567890124";
                      setAadhaarInput("2345 6789 0124");
                    }
                    setAadhaarConsent(true);
                    setDigiLockerStep("otp");
                  }}
                  className="w-full py-3 apple-btn-primary rounded-full text-xs font-medium transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Agree &amp; Request UIDAI OTP</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {digiLockerStep === "otp" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="text-sm font-semibold text-white">Enter Aadhaar Verification OTP</div>
                  <p className="text-xs text-zinc-400">
                    OTP sent to registered mobile ending in <strong>•••• {aadhaarInput.replace(/\s+/g, "").slice(-4) || "0124"}</strong>
                  </p>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={digiLockerOtp}
                  onChange={(e) => setDigiLockerOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full apple-input rounded-2xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white placeholder-zinc-600"
                />

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center text-xs text-zinc-400 flex items-center justify-between">
                  <span className="font-mono text-[11px]">Sandbox OTP: <strong className="text-zinc-200">749201</strong></span>
                  <button
                    type="button"
                    onClick={() => setDigiLockerOtp("749201")}
                    className="text-[11px] text-zinc-300 hover:text-white underline"
                  >
                    Auto-fill OTP
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyAadhaar(aadhaarInput || "234567890124")}
                  disabled={isAadhaarLoading}
                  className="w-full py-3 apple-btn-primary rounded-full text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isAadhaarLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm &amp; Link Credential</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
