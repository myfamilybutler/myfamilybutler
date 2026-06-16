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

## Bring Your Own Key (BYOK) Model

To make hosting free for everyone, MyFamilyButler can be configured in a **Bring Your Own Key (BYOK)** structure. Parents obtain their own free Gemini API keys from Google AI Studio and paste them into the dashboard. This offloads AI processing costs, allowing a single hosted instance of this app to support thousands of families for $0/month.


## Documentation

Start here:
- [docs/INDEX.md](./docs/INDEX.md) - Canonical documentation map and reading order
- [.agents/README.md](./.agents/README.md) - AI agent system overview and coordination rules
- [.agents/INDEX.md](./.agents/INDEX.md) - Quick reference for all specialized agents

Core governance:
- [docs/AI_TOOLING_RULEBOOK.md](./docs/AI_TOOLING_RULEBOOK.md) - Hard engineering rules and merge gates
- [docs/AI_OPERATING_MODEL.md](./docs/AI_OPERATING_MODEL.md) - AI delivery loop (build, review, fix, re-audit)
- [docs/MULTI_ROLE_REVIEW_TEMPLATE.md](./docs/MULTI_ROLE_REVIEW_TEMPLATE.md) - Major-change review artifact

Engineering and operations:
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Runtime boundaries and data flow
- [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) - Implementation guide and commands
- [docs/RUNBOOK_SUPABASE_MIGRATIONS.md](./docs/RUNBOOK_SUPABASE_MIGRATIONS.md) - Migration automation and recovery
- [docs/SECURITY.md](./docs/SECURITY.md) - Security controls and incident flow

Agent configurations (domain-specific rules):
- [.agents/agents/frontend.md](./.agents/agents/frontend.md) - React/Next.js/UI rules
- [.agents/agents/backend.md](./.agents/agents/backend.md) - API routes and Server Actions
- [.agents/agents/supabase.md](./.agents/agents/supabase.md) - Database and RLS policies
- [.agents/agents/ai-systems.md](./.agents/agents/ai-systems.md) - AI provider configuration
- [.agents/agents/messaging.md](./.agents/agents/messaging.md) - WhatsApp/Telegram/360dialog
- [.agents/agents/uxui.md](./.agents/agents/uxui.md) - Design system and accessibility
- [.agents/agents/architecture.md](./.agents/agents/architecture.md) - System boundaries and data flow
- [.agents/agents/security.md](./.agents/agents/security.md) - Security controls
- [.agents/agents/testing.md](./.agents/agents/testing.md) - Test strategy and quality gates
- [.agents/agents/devops.md](./.agents/agents/devops.md) - CI/CD and infrastructure

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
npm test          # Run Vitest tests
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to learn how you can help improve MyFamilyButler.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
