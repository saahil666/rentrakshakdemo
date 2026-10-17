import { NextRequest, NextResponse } from "next/server";
import { getProperties, saveProperty, findLandlordById, VerifiedProperty } from "@/lib/db";

export async function GET() {
  try {
    const properties = getProperties();
    return NextResponse.json({ success: true, properties });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      landlordId,
      title,
      address,
      monthlyRent,
      depositAmount,
      imageUrl,
      galleryImages,
      videoUrl,
      tourAudioUrl,
      amenities,
      latitude,
      longitude,
    } = body;

    if (!landlordId || !title || !monthlyRent) {
      return NextResponse.json(
        { success: false, error: "Landlord ID, title, and monthly rent are required." },
        { status: 400 }
      );
    }

    const landlord = findLandlordById(landlordId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: "Landlord not found." }, { status: 404 });
    }

    const sanitizedImageUrl = (imageUrl && typeof imageUrl === "string" && !imageUrl.startsWith("blob:"))
      ? imageUrl
      : (Array.isArray(galleryImages) && galleryImages[0] && !galleryImages[0].startsWith("blob:"))
      ? galleryImages[0]
      : "/apartment.jpg";

    const sanitizedGalleryImages = Array.isArray(galleryImages) && galleryImages.length > 0
      ? galleryImages.filter((url: string) => typeof url === "string" && !url.startsWith("blob:"))
      : [sanitizedImageUrl];

    const sanitizedVideoUrl = (videoUrl && typeof videoUrl === "string" && !videoUrl.startsWith("blob:"))
      ? videoUrl
      : undefined;

    const propId = `prop_${Date.now()}`;
    const newProperty: VerifiedProperty = {
      id: propId,
      landlordId: landlord.id,
      landlordName: landlord.fullName,
      title: title.trim(),
      address: address?.trim() || landlord.propertyCoordinates?.address || "Bengaluru, Karnataka",
      monthlyRent: Number(monthlyRent) || 30000,
      depositAmount: Number(depositAmount) || 15000,
      imageUrl: sanitizedImageUrl,
      galleryImages: sanitizedGalleryImages.length > 0 ? sanitizedGalleryImages : [sanitizedImageUrl],
      videoUrl: sanitizedVideoUrl,
      tourAudioUrl: tourAudioUrl || (sanitizedVideoUrl ? sanitizedVideoUrl.replace(/\.[^.]+$/, "_audio.wav") : (landlord.isVoiceVerified ? "/demo/scenario_c_tour_real_landlord.wav" : undefined)),
      amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ["Gated Society", "Power Backup", "Wi-Fi"],
      coordinates: {
        latitude: Number(latitude) || landlord.propertyCoordinates?.latitude || 12.9352,
        longitude: Number(longitude) || landlord.propertyCoordinates?.longitude || 77.6245,
      },
      verificationBadges: {
        aadhaarVerified: landlord.isAadhaarVerified,
        geofenceVerified: landlord.isGpsVerified,
        voiceprintEnrolled: landlord.isVoiceVerified,
      },
      createdAt: new Date().toISOString(),
    };

    saveProperty(newProperty);

    return NextResponse.json({
      success: true,
      message: "Property listed successfully under SubletShield Verified Directory!",
      property: newProperty,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Property Listing Error:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
