import { NextResponse } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var __otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

const otpStore = global.__otpStore ?? new Map<string, { otp: string; expiresAt: number }>();
if (process.env.NODE_ENV !== "production") {
  global.__otpStore = otpStore;
}

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const record = otpStore.get(cleanEmail);

    if (!record) {
      return NextResponse.json({ error: "No OTP was requested for this email, or it has expired" }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return NextResponse.json({ error: "This OTP has expired. Please request a new code." }, { status: 400 });
    }

    if (record.otp !== cleanOtp) {
      return NextResponse.json({ error: "Incorrect verification code. Please check and try again." }, { status: 400 });
    }

    // OTP verified successfully!
    otpStore.delete(cleanEmail);

    return NextResponse.json({
      success: true,
      verified: true,
      verifiedAt: new Date().toISOString(),
      message: "Email address verified successfully",
    });
  } catch (error: unknown) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
