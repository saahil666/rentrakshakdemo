import fs from "fs";
import path from "path";
import { Landlord, VerifiedProperty, DatabaseSchema } from "@/types/db";
import { calculateGpsDistanceMeters } from "./geo";

export type { Landlord, VerifiedProperty, DatabaseSchema };
export { calculateGpsDistanceMeters };

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "subletshield_db.json");

const SEED_PROPERTIES: VerifiedProperty[] = [];

const SEED_LANDLORDS: Landlord[] = [
  {
    id: "landlord_rajesh_blr",
    email: "rajesh.sharma@subletshield.internal",
    phone: "+91 98765 43210",
    fullName: "Rajesh Sharma",
    aadhaarNumber: "XXXX-XXXX-7890",
    isEmailVerified: true,
    isPhoneVerified: true,
    isAadhaarVerified: true,
    isGpsVerified: true,
    isVoiceVerified: true,
    isFullyVerified: true,
    enrolledSpeakerId: "spk_rajesh_sharma_blr",
    propertyCoordinates: {
      latitude: 12.9352,
      longitude: 77.6245,
      address: "80 Feet Rd, 4th Block, Koramangala, Bengaluru",
    },
    deviceGpsCoordinates: {
      latitude: 12.9351,
      longitude: 77.6244,
    },
    gpsDistanceMeters: 15,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      landlords: SEED_LANDLORDS,
      properties: SEED_PROPERTIES,
      otpStore: {},
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as DatabaseSchema;
    if (!data.landlords) data.landlords = SEED_LANDLORDS;
    if (!data.properties) data.properties = SEED_PROPERTIES;
    if (!data.otpStore) data.otpStore = {};
    return data;
  } catch (err) {
    console.error("Error reading database, creating fresh seed:", err);
    const initialData: DatabaseSchema = {
      landlords: SEED_LANDLORDS,
      properties: SEED_PROPERTIES,
      otpStore: {},
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

function writeDatabase(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempFile, DB_FILE);
}

// ----------------------------------------------------
// Public Database Accessors
// ----------------------------------------------------

export function getLandlords(): Landlord[] {
  const db = initDatabase();
  return db.landlords;
}

export function findLandlordByPhone(phone: string): Landlord | undefined {
  const db = initDatabase();
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return db.landlords.find((l) => l.phone && l.phone.replace(/[^0-9]/g, "").endsWith(cleanPhone.slice(-10)));
}

export function findLandlordByEmail(email: string): Landlord | undefined {
  const db = initDatabase();
  const cleanEmail = email.trim().toLowerCase();
  return db.landlords.find((l) => l.email && l.email.trim().toLowerCase() === cleanEmail);
}

export function findLandlordById(id: string): Landlord | undefined {
  const db = initDatabase();
  return db.landlords.find((l) => l.id === id);
}

export function saveLandlord(landlord: Landlord): Landlord {
  const db = initDatabase();
  const index = db.landlords.findIndex((l) => l.id === landlord.id);
  if (index >= 0) {
    db.landlords[index] = landlord;
  } else {
    db.landlords.push(landlord);
  }
  writeDatabase(db);
  return landlord;
}

export function getProperties(): VerifiedProperty[] {
  const db = initDatabase();
  return db.properties;
}

export function saveProperty(property: VerifiedProperty): VerifiedProperty {
  const db = initDatabase();
  const index = db.properties.findIndex((p) => p.id === property.id);
  if (index >= 0) {
    db.properties[index] = property;
  } else {
    db.properties.unshift(property);
  }
  writeDatabase(db);
  return property;
}

export function setOtp(target: string, otp: string): void {
  const db = initDatabase();
  const key = target.trim().toLowerCase();
  db.otpStore[key] = {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  writeDatabase(db);
}

export function verifyOtp(target: string, inputOtp: string): boolean {
  const db = initDatabase();
  const key = target.trim().toLowerCase();
  const entry = db.otpStore[key];
  // Demo convenience: If 7492 is entered or matching stored OTP
  if (inputOtp === "7492") return true;
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.otp === inputOtp;
}
