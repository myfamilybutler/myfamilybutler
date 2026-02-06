# MyFamilyButler 🏠

AI-powered family calendar assistant for Austrian households. Manage events,
reminders, and schedules via WhatsApp, Telegram, or web dashboard.

## Features

- 📱 **Multi-Channel** - WhatsApp, Telegram, 360dialog, Web Dashboard
- 🧠 **AI-Powered** - Natural language event extraction (German/Austrian)
- 📸 **Vision Processing** - Extract events from school letters & photos
- 📅 **Google Calendar Sync** - Bidirectional sync with Google Calendar
- 👨‍👩‍👧‍👦 **Family Sharing** - Shared household calendar

## Tech Stack

| Component   | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 16 (App Router)                         |
| Database    | Supabase (PostgreSQL + Auth)                    |
| AI Primary  | Gemini 3 Flash Preview (free tier)              |
| AI Fallback | OpenAI GPT-4o-mini                              |
| Messaging   | WhatsApp Cloud API, Telegram Bot API, 360dialog |
| State       | Zustand                                         |
| Validation  | Zod                                             |
| Styling     | Tailwind CSS + shadcn/ui                        |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI API key (Gemini) and/or OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/myfamilybutler.git
cd myfamilybutler

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Run development server
npm run dev
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (at least one required)
GOOGLE_GEMINI_API_KEY=      # Primary - free tier
OPENAI_API_KEY=             # Fallback

# Messaging
WHATSAPP_API_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_ID=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Google Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_APP_URL=
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes & webhooks
│   └── dashboard/         # Protected dashboard pages
├── actions/               # Server Actions
├── components/            # React components
├── lib/                   # Core business logic
│   ├── ai/               # AI providers (Gemini + OpenAI)
│   ├── agents/           # Vision agent
│   ├── auth/             # Authentication
│   ├── channels/         # WhatsApp, Telegram, 360dialog
│   ├── supabase/         # Database operations
│   ├── sync/             # Google Calendar sync
│   └── utils/            # Shared utilities
└── stores/               # Zustand stores
```

## AI Provider Strategy

The app uses a **cost-optimized dual-provider strategy**:

1. **Primary: Gemini 3 Flash Preview** (Free tier / $0.075 per 1M tokens)
2. **Fallback: OpenAI GPT-4o-mini** ($0.15 per 1M tokens)

Automatic fallback when Gemini fails or is unavailable.

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture & data flow
- [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) - Development guide & patterns
- [docs/PROJECT_INFO.md](./docs/PROJECT_INFO.md) - Project status & tech stack
- [docs/AI_TOOLING_RULEBOOK.md](./docs/AI_TOOLING_RULEBOOK.md) - AI tool rules, concurrency, and quality gates

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
npm test          # Run Vitest tests
```

## License

Private - All rights reserved.
