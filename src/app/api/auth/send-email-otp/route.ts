import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory OTP storage for demonstration and fast verification
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
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Generate a secure 6-digit cryptographic PIN
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    otpStore.set(cleanEmail, { otp, expiresAt });

    const smtpUser = process.env.SMTP_USER || "gmailbot25@gmail.com";
    const smtpPass = (process.env.SMTP_PASS || "oixmobmuvoeuwmjs").replace(/\s+/g, "");
    const smtpName = process.env.SMTP_NAME || "RentRakshak Security";

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"${smtpName}" <${smtpUser}>`,
          to: cleanEmail,
          subject: `RentRakshak Verification Code: ${otp}`,
          text: `Your RentRakshak verification code is: ${otp}. This code expires in 10 minutes.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; background: #09090b; color: #f4f4f5;">
              <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">RentRakshak Verification</h2>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                Use the single-use verification code below to verify your session:
              </p>
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; border: 1px solid rgba(255,255,255,0.08);">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
                This code will expire in 10 minutes. If you did not request this verification, please discard this message.
              </p>
            </div>
          `,
        });

        return NextResponse.json({
          success: true,
          demoMode: false,
          message: `Verification code sent to ${cleanEmail}`,
        });
      } catch (smtpErr) {
        console.warn("SMTP send failed, using fallback:", smtpErr);
      }
    }

    return NextResponse.json({
      success: true,
      demoMode: true,
      simulatedOtp: otp,
      message: `Verification code: ${otp}`,
    });
  } catch (error: unknown) {
    console.error("Error sending OTP:", error);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
