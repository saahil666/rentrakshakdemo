export interface Landlord {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  aadhaarNumber: string;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  isAadhaarVerified: boolean;
  isGpsVerified: boolean;
  isVoiceVerified: boolean;
  isFullyVerified: boolean;
  enrolledSpeakerId?: string;
  propertyCoordinates?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deviceGpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  gpsDistanceMeters?: number;
  createdAt: string;
}

export interface VerifiedProperty {
  id: string;
  landlordId: string;
  landlordName: string;
  title: string;
  address: string;
  monthlyRent: number;
  depositAmount: number;
  imageUrl: string;
  galleryImages?: string[];
  videoUrl?: string;
  tourAudioUrl?: string;
  amenities: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  verificationBadges: {
    aadhaarVerified: boolean;
    geofenceVerified: boolean;
    voiceprintEnrolled: boolean;
  };
  createdAt: string;
}

export interface DatabaseSchema {
  landlords: Landlord[];
  properties: VerifiedProperty[];
  otpStore: Record<string, { otp: string; expiresAt: number }>;
}
