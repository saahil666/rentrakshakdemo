/**
 * Verhoeff Algorithm for Aadhaar Validation
 * UIDAI uses the Verhoeff checksum algorithm for 12-digit Aadhaar numbers.
 */

// Multiplication table (d)
const d: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table (p)
const p: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates whether a given 12-digit number satisfies the Verhoeff checksum.
 */
export function validateVerhoeffAadhaar(aadhaar: string): { valid: boolean; reason?: string } {
  const clean = aadhaar.replace(/\s+/g, "");

  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, reason: "Aadhaar must be exactly 12 numeric digits" };
  }

  // Aadhaar cannot start with 0 or 1 according to UIDAI specifications
  if (clean.startsWith("0") || clean.startsWith("1")) {
    return { valid: false, reason: "Aadhaar numbers do not begin with 0 or 1" };
  }

  let c = 0;
  const invertedArray = clean.split("").reverse().map(Number);

  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }

  if (c === 0) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Invalid Verhoeff checksum. Please verify the 12 digits.",
  };
}

/**
 * Calculates the Haversine distance in meters between two GPS coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
