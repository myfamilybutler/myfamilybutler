# Onboarding System Design

> **Last Updated:** 2026-01-19 **Status:** Partially Implemented

---

## 1. Core Principle

> **Messaging-first, Desktop-friendly** — Users start via WhatsApp or Telegram (zero
> friction), then optionally link an email to enable persistent desktop login.

### Philosophy

- **Mobile-first entry**: WhatsApp/QR is the primary onboarding (no registration
  forms)
- **Magic link for desktop**: Initial dashboard access via WhatsApp command
- **Email linking optional**: Add email in settings for desktop login (no OAuth)
- **One-time profile modal**: Show once on first dashboard visit, never nag
  again
- **Respect user choice**: Settings page always available for later

---

## 2. Current State → Target State

| Aspect             | Current               | Target                              |
| ------------------ | --------------------- | ----------------------------------- |
| **Primary entry**  | Web registration form | WhatsApp message / QR code          |
| **Phone capture**  | Optional              | Automatic (from WhatsApp)           |
| **Desktop access** | Email/password login  | Magic link → optional email linking |
| **Onboarding**     | Multi-step wizard     | One-time optional modal             |

---

## 3. Target Architecture

### Flow A: Mobile-First Entry (Recommended Path)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🏠 My Family Butler                                               │
│   Dein Familienkalender auf WhatsApp                               │
│                                                                     │
│   ─────────────────────────────────────────────────                │
│                                                                     │
│   📱 ON MOBILE (detected via user-agent):                          │
│   ┌───────────────────────────────────────┐                        │
│   │   [📱 Jetzt auf WhatsApp starten]     │  ← wa.me/436xxx link   │
│   │   [📱 Oder mit Telegram starten]      │  ← t.me/xxx link       │
│   └───────────────────────────────────────┘                        │
│                                                                     │
│   💻 ON DESKTOP (detected via user-agent):                         │
│   ┌───────────────────────────────────────┐                        │
│   │  Scanne den QR-Code mit deinem Handy  │                        │
│   │                                       │                        │
│   │       ┌─────────────┐                 │                        │
│   │       │ ▓▓▓▓▓▓▓▓▓▓▓ │                 │                        │
│   │       │ ▓▓▓▓▓▓▓▓▓▓▓ │  ← QR = wa.me/  │                        │
│   │       │ ▓▓▓▓▓▓▓▓▓▓▓ │                 │                        │
│   │       │ ▓▓▓▓▓▓▓▓▓▓▓ │                 │                        │
│   │       └─────────────┘                 │                        │
│   │                                       │                        │
│   │  "Starte einen Chat um loszulegen!"   │                        │
│   └───────────────────────────────────────┘                        │
│                                                                     │
│   ───────────────────────────────────────────────────────────────  │
│                                                                     │
│   Schon ein Konto?                                                  │
│   ┌───────────────────────────────────────┐                        │
│   │  Email: [___________________]         │                        │
│   │  [📧 Login-Link senden]               │ ← Email magic link     │
│   └───────────────────────────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
         NEW USER (WhatsApp/Telegram)        RETURNING USER (Email)
                  │                                   │
                  ▼                                   ▼
┌─────────────────────────────────┐  ┌────────────────────────────────┐
│     WHATSAPP FIRST MESSAGE      │  │      EMAIL MAGIC LINK          │
├─────────────────────────────────┤  ├────────────────────────────────┤
│                                 │  │                                │
│ User: "Hallo"                   │  │ 1. User enters email           │
│                                 │  │ 2. Find user by linked_email   │
│ Bot: 🎉 Willkommen!             │  │ 3. Send magic link to email    │
│      Ich bin dein Familien-     │  │ 4. User clicks → Dashboard     │
│      kalender-Assistent.        │  │                                │
│                                 │  │ (Same 60-day session as        │
│      Schick mir Termine:        │  │  WhatsApp magic link)          │
│      📅 "Zahnarzt Montag 10"    │  │                                │
│      📸 Foto von Briefen        │  │                                │
│                                 │  │                                │
│      Tippe "dashboard" für      │  │                                │
│      dein Online-Dashboard!     │  │                                │
└─────────────────────────────────┘  └────────────────────────────────┘
                  │
         User types: "dashboard"
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD + ONBOARDING MODAL                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  ✨ Willkommen im Dashboard!                            │        │
│  │  ────────────────────────────                           │        │
│  │                                                         │        │
│  │  Vervollständige dein Profil (optional):               │        │
│  │                                                         │        │
│  │  Dein Name: [________________]                          │        │
│  │                                                         │        │
│  │  Familienmitglieder:                                    │        │
│  │  [+ Hinzufügen]                                         │        │
│  │                                                         │        │
│  │  ─────────────────────────────────────                 │        │
│  │  📧 Für Desktop-Login Email hinzufügen:                │        │
│  │  Email: [________________]                              │        │
│  │                                                         │        │
│  │  [Überspringen]              [Speichern →]             │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                     │
│  (Dashboard visible behind modal)                                   │
│  (Modal shown ONCE, marked as shown even if skipped)               │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Flow B: WhatsApp/Telegram Entry

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FIRST MESSAGE                                 │
├─────────────────────────────────────────────────────────────────────┤
│  User: "Hallo"                                                      │
│                                                                     │
│  Bot: 🎉 Willkommen bei My Family Butler!                           │
│                                                                     │
│       Ich bin dein Familienkalender-Assistent.                      │
│       Schick mir Termine, Erinnerungen, oder Fotos von Briefen!     │
│                                                                     │
│       📅 "Zahnarzt am Montag um 10"                                 │
│       ⏰ "Erinnere mich morgen an..."                               │
│       📸 [Foto von Schulbrief senden]                               │
│                                                                     │
│       ───────────────────────                                       │
│       💡 Tipp: Tippe "Dashboard" für dein Online-Dashboard          │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                          (User continues using normally)
                                     │
                         User types: "Dashboard"
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DASHBOARD LINK SENT                             │
├─────────────────────────────────────────────────────────────────────┤
│  Bot: 🔗 Hier ist dein persönlicher Dashboard-Link:                 │
│       https://app.myfamilybutler.com/api/auth/magic?token=xxx       │
│                                                                     │
│       ⏱️ Gültig für 15 Minuten                                      │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                          (User clicks link)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD + ONBOARDING MODAL                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  ✨ Complete Your Profile (Optional)                    │        │
│  │  ────────────────────────────────────                   │        │
│  │                                                         │        │
│  │  Your Name: [________________]                          │        │
│  │                                                         │        │
│  │  Family Members:                                        │        │
│  │  [+ Add family member]                                  │        │
│  │                                                         │        │
│  │  Email for desktop login:                               │        │
│  │  Email: [________________]                              │        │
│  │  [Skip]                    [Save & Continue →]          │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                     │
│  (Dashboard visible behind modal)                                   │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                              DASHBOARD
                   (Modal marked as "shown", never again)
```


---

## 4. Best Practices Applied

### 4.1 Phone Number Handling

| Practice                   | Implementation                                         |
| -------------------------- | ------------------------------------------------------ |
| **Country code detection** | Auto-detect from browser locale (default: +43 Austria) |
| **Format validation**      | Use `libphonenumber-js` for real-time validation       |
| **E.164 format storage**   | Always store as `+436601234567`                        |
| **WhatsApp verification**  | Deep link verification (see 4.1.1 below)               |

### 4.1.1 WhatsApp Deep Link Verification (Recommended)

Instead of SMS verification (costly, complex), use **WhatsApp deep links** to
verify phone ownership:

```
┌────────────────────────────────────────────────────────────────────┐
│                   PHONE VERIFICATION FLOW                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. User enters phone number                                       │
│     ┌─────────────────────────────────────┐                        │
│     │ [+43] [660 1234567            ]     │                        │
│     └─────────────────────────────────────┘                        │
│                         │                                          │
│                         ▼                                          │
│  2. User clicks "Verify via WhatsApp"                              │
│     ┌─────────────────────────────────────┐                        │
│     │ [📱 Verify via WhatsApp]            │                        │
│     └─────────────────────────────────────┘                        │
│                         │                                          │
│         Generates: VERIFY-{6-char-code}                            │
│         Deep link: wa.me/43xxx?text=VERIFY-ABC123                  │
│                         │                                          │
│                         ▼                                          │
│  3. WhatsApp opens with pre-filled message                         │
│     ┌─────────────────────────────────────┐                        │
│     │  To: My Family Butler               │                        │
│     │  ─────────────────────              │                        │
│     │  [VERIFY-ABC123           ] [Send]  │                        │
│     └─────────────────────────────────────┘                        │
│                         │                                          │
│                         ▼                                          │
│  4. Webhook receives message                                       │
│     → Match code to pending verification                           │
│     → Mark phone as verified                                       │
│     → Send welcome message                                         │
│                         │                                          │
│                         ▼                                          │
│  5. Web page polls for verification                                │
│     → Shows "✅ Verified!" and continues                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Why This Approach is Superior:**

| Aspect                  | SMS Verification        | WhatsApp Deep Link      |
| ----------------------- | ----------------------- | ----------------------- |
| **Cost**                | €0.05-0.10 per SMS      | Free                    |
| **Delivery rate**       | 95% (carrier issues)    | 99%+                    |
| **User friction**       | Wait for SMS, copy code | One click               |
| **Proves ownership**    | ⚠️ Partial              | ✅ Full                 |
| **Onboards to product** | ❌ No                   | ✅ Yes (first message!) |

**Deep Link Format:**

```
https://wa.me/{BOT_PHONE_NUMBER}?text=VERIFY-{CODE}

Example:
https://wa.me/436601234567?text=VERIFY-ABC123
```

**Database Table:**

```sql
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes'
);
```

**Edge Cases:**

| Scenario                             | Handling                    |
| ------------------------------------ | --------------------------- |
| User closes WhatsApp without sending | Timeout 15 min, allow retry |
| Code expires                         | Generate new code on retry  |
| User sends wrong code                | Ignore, show retry button   |
| Phone already verified               | Skip verification           |
| Phone used by another user           | Show error, suggest login   |

### 4.2 Email Linking (for Desktop Login)

Email is used for desktop login convenience, not primary registration:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EMAIL LINKING FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User (WhatsApp-registered) wants desktop login:                   │
│                                                                     │
│  1. Dashboard Modal (first visit) OR Settings page                 │
│     ┌────────────────────────────────────────────┐                 │
│     │  � Add email for desktop login:           │                 │
│     │  Email: [________________]                 │                 │
│     └────────────────────────────────────────────┘                 │
│                         │                                          │
│                         ▼                                          │
│  2. Save email to user record                                      │
│     UPDATE users SET linked_email = 'x@y.com'                     │
│     WHERE phone_number = '+43xxx'                                  │
│                         │                                          │
│                         ▼                                          │
│  3. Next time on desktop:                                          │
│     Landing page → Enter email → Magic link sent                   │
│     → Click link → Dashboard (60-day session)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  linked_email TEXT UNIQUE DEFAULT NULL;
```

**Key Rules:**

| Rule                   | Implementation                            |
| ---------------------- | ----------------------------------------- |
| **No passwords**       | Email magic links only (same as WhatsApp) |
| **Phone is primary**   | Email is convenience layer for desktop    |
| **One email per user** | `linked_email` is UNIQUE                  |
| **Optional**           | Users can skip email linking entirely     |

### 4.3 Modal UX Guidelines

```typescript
// Key principles for onboarding modals
const MODAL_GUIDELINES = {
  // Show modal only ONCE per user
  showCondition: "!user.onboarding_modal_shown",

  // Mark as shown even if skipped
  onSkip: "SET user.onboarding_modal_shown = true",
  onComplete: "SET user.onboarding_modal_shown = true",

  // Never show again
  neverNag: true,

  // Respect user choice
  settingsAlwaysAvailable: true,
};
```

### 4.4 Progressive Disclosure

| Stage          | What User Sees                                             | Hidden Until...  |
| -------------- | ---------------------------------------------------------- | ---------------- |
| Initial        | Basic chat, events                                         | —                |
| After 3 events | "💡 Tipp: Du kannst Familiennamen zu Terminen hinzufügen!" | 3 events created |
| After 7 days   | "📊 Diese Woche: 5 Termine. Schau im Dashboard!"           | 7 days of usage  |
| Never          | Nagging to complete profile                                | Always hidden    |

---

## 5. Database Schema Updates

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  onboarding_modal_shown BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  onboarding_source TEXT DEFAULT 'whatsapp' 
  CHECK (onboarding_source IN ('whatsapp', 'telegram', '360dialog', 'invite'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  linked_email TEXT UNIQUE DEFAULT NULL;
```

---

## 6. Implementation Checklist

### Phase 1: Web Onboarding (Priority)

- [ ] **Step 1.1**: Enforce mandatory phone number on `/onboarding`
- [ ] **Step 1.2**: Add phone format validation with `libphonenumber-js`
- [ ] **Step 1.3**: Add country code picker (default: Austria +43)
- [ ] **Step 1.4**: Redesign onboarding as multi-step wizard
- [ ] **Step 1.5**: Add "Skip" functionality for optional steps

### Phase 2: Email Magic Link Login

- [x] **Step 2.1**: Create email-login API endpoint
- [ ] **Step 2.2**: Set up email sending (Resend)
- [x] **Step 2.3**: Create email login page
- [ ] **Step 2.4**: Add email linking to dashboard modal
- [ ] **Step 2.5**: Add email linking to settings page

### Phase 3: Messaging Channel Onboarding

- [x] **Step 3.1**: Add welcome message for WhatsApp first contact
- [ ] **Step 3.2**: Add welcome message for Telegram first contact
- [x] **Step 3.3**: Create onboarding modal component for dashboard
- [x] **Step 3.4**: Show modal on first magic link access
- [x] **Step 3.5**: Track `onboarding_modal_shown` flag

### Phase 4: Settings Page

- [ ] **Step 4.1**: Add email linking option to settings
- [ ] **Step 4.2**: Add profile editing section
- [ ] **Step 4.3**: Add family member management

---

## 7. Component Structure

```
src/
├── components/
│   └── onboarding/
│       ├── OnboardingModal.tsx       # One-time modal for profile + email
│       └── EmailLinkingForm.tsx      # Email input for desktop login
├── app/
│   └── api/
│       └── auth/
│           └── email-login/          # Email magic link endpoint
└── lib/
    └── email/
        └── send-email.ts             # Email sending utility
```

---

## 8. API Changes

### New Endpoint: Complete Onboarding Modal

```typescript
// POST /api/auth/complete-onboarding-modal
// For messaging users who access dashboard first

interface CompleteOnboardingModalRequest {
  displayName?: string;
  familyMembers?: { name: string }[];
  linkedEmail?: string; // Optional email for desktop login
}

interface CompleteOnboardingModalResponse {
  success: boolean;
}
```

### Updated: Complete Onboarding

```typescript
// POST /api/auth/complete-onboarding
// Phone is now REQUIRED

interface CompleteOnboardingRequest {
  supabaseUserId: string;
  phoneNumber: string; // REQUIRED (was optional)
  displayName?: string; // Optional
  familyMembers?: { name: string }[]; // Optional
}
```

---

## 9. Success Metrics

| Metric              | Target | How to Measure                        |
| ------------------- | ------ | ------------------------------------- |
| Phone capture rate  | 100%   | All users have phone (from WhatsApp)  |
| Email linking rate  | 30%    | Users who add email for desktop login |
| Profile completion  | 40%    | Users who add name + family members   |
| Onboarding drop-off | <5%    | Users who abandon dashboard modal     |

---

## 10. Open Questions

1. ~~**Phone Verification**: Should we add optional SMS verification later?~~ →
   ✅ **Solved**: Using WhatsApp deep link verification (see 4.1.1)

2. **Invite Links**: Should invited family members go through the same
   onboarding?

3. **Fallback**: What if user doesn't have WhatsApp installed on the device
   they're registering from? (Desktop browser, etc.)

4. **Telegram Onboarding**: Do we require a phone share gate on first contact
   or allow limited usage before phone verification?

---

_Document maintained by the development team. Update as implementation
progresses._
