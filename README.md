# RentRakshak 🛡️
### Zero-Trust Rental Escrow & Biometric Property Verification Vault

RentRakshak protects tenants and authentic landlords against rental scams, phantom listings, and deposit fraud using a multi-layered verification protocol:

1. **UIDAI DigiLocker e-KYC**: Verhoeff checksum algorithm and sandbox consent to verify genuine landlord identity without storing plain credentials.
2. **Physical Presence Geofencing**: Cross-checks live device GPS against declared property coordinates and landmark centroids (e.g. BMS College of Engineering) within an authentic radius.
3. **Biometric Deepfake Voiceprint Scan**: Real-time acoustic analysis powered by DetectifAI to verify voice authenticity and enroll speaker identity during ownership declaration.
4. **Zero-Trust Rental Escrow**: Funds are locked securely in an escrow vault until both physical inspection and tenancy terms are confirmed.
5. **Direct OTP Verification Bot**: Transactional security notifications and OTP generation powered by Gmail SMTP automation.

---

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router, Server Components & Route Handlers)
- **Language**: TypeScript
- **Styling**: Tailored Dark Glassmorphism Design System (Vanilla CSS tokens)
- **Mapping**: Leaflet + OpenStreetMap + Nominatim / Photon Landmark Geocoding
- **Biometrics**: DetectifAI Live Voice & Deepfake Detection
- **Identity**: UIDAI DigiLocker Sandbox & Verhoeff Checksum Validation
- **Mailing**: Nodemailer Direct SMTP Service

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 18.x or later
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/saahil666/rentrakshakdemo.git
cd rentrakshakdemo
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
# DetectifAI API Key
DETECTIFAI_API_KEY=your_detectifai_api_key

# Gmail SMTP Mailer Bot
GMAIL_USER=your_gmail_id@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛️ Verification Architecture

```
Tenant Deposit ──> Escrow Vault (Locked)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
Landlord Verification             Property Geofencing
├─ UIDAI DigiLocker Consent       ├─ GPS Match (0-500m)
├─ Verhoeff Checksum              ├─ Landmark / Campus Lookup
└─ DetectifAI Voice Biometrics    └─ On-Site Device Telemetry
        │                                 │
        └────────────────┬────────────────┘
                         ▼
        Physical Inspection & Mutual Sign-off
                         │
                         ▼
             Escrow Released to Landlord
```

---

## 📄 License
MIT License. Created for Hackathon 2026.
