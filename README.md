<p align="center">
  <h1 align="center">MyFamilyButler 🏠</h1>
  <p align="center">
    AI-powered family calendar assistant for Austrian households
  </p>
  <p align="center">
    <a href="https://github.com/myfamilybutler/myfamilybutler/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/myfamilybutler/myfamilybutler" alt="License">
    </a>
    <a href="https://github.com/myfamilybutler/myfamilybutler/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/myfamilybutler/myfamilybutler/ci.yml?branch=main" alt="CI">
    </a>
    <a href="https://github.com/myfamilybutler/myfamilybutler/releases">
      <img src="https://img.shields.io/github/v/release/myfamilybutler/myfamilybutler" alt="Release">
    </a>
    <img src="https://img.shields.io/badge/Node-22+-green.svg" alt="Node 22+">
  </p>
</p>

---

MyFamilyButler helps busy families manage events, reminders, and schedules
through natural language. Parents can send a quick WhatsApp message like
"Zahnarzt Montag 10" or snap a photo of a school letter, and the assistant
creates calendar events automatically.

## ✨ Features

- 📱 **Multi-Channel** — WhatsApp, Telegram, 360dialog, and a responsive web dashboard
- 🧠 **AI-Powered** — Natural-language event extraction in German/Austrian dialects
- 📸 **Vision Processing** — Extract events from school letters, appointment cards, and photos
- 📅 **Google Calendar Sync** — Bidirectional sync with Google Calendar
- 👨‍👩‍👧‍👦 **Family Sharing** — Shared household calendar with role-aware access
- 🔐 **Passwordless Login** — Magic-link login from messaging channels

## 🚀 Demo

- **Live app**: [https://myfamilybutler.com](https://myfamilybutler.com)
- **Landing page**: [https://myfamilybutler.com](https://myfamilybutler.com)

<p align="center">
  <img src="./docs/assets/dashboard-preview.png" alt="Dashboard preview" width="800">
</p>
<p align="center">
  <img src="./docs/assets/demo.gif" alt="Demo showing WhatsApp integration" width="800">
</p>

## 🛠️ Tech Stack

| Component   | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 16 (App Router)                         |
| Database    | Supabase (PostgreSQL + Auth)                    |
| AI Primary  | Gemini 3 Flash Preview                          |
| AI Fallback | OpenAI GPT-4o-mini                              |
| Messaging   | WhatsApp Cloud API, Telegram Bot API, 360dialog |
| State       | Zustand                                         |
| Validation  | Zod                                             |
| Styling     | Tailwind CSS + shadcn/ui                        |
| Testing     | Vitest + React Testing Library                  |

## 📋 Prerequisites

- [Node.js 22+](https://nodejs.org/) (see [`.nvmrc`](./.nvmrc))
- [npm](https://www.npmjs.com/) (ships with Node.js)
- A [Supabase](https://supabase.com/) project
- A Google AI (Gemini) API key and/or an OpenAI API key
- (Optional) Messaging provider accounts for WhatsApp, Telegram, or 360dialog

## ⚡ Quick Start

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmyfamilybutler%2Fmyfamilybutler&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,GOOGLE_GEMINI_API_KEY)

```bash
# Clone the repository
git clone https://github.com/myfamilybutler/myfamilybutler.git
cd myfamilybutler

# Install dependencies
npm install

# Copy environment variables and seed the local database
npm run setup

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> For a complete local setup guide — including Supabase, messaging channels,
> and Google Calendar — see [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md).

## 🔑 Environment Variables

The authoritative list lives in [`.env.local.example`](./.env.local.example).
Key groups:

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

## 📁 Project Structure

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

## 💰 Cost-Optimized AI Strategy

The app uses a **dual-provider strategy** to keep costs low:

1. **Primary: Gemini 3 Flash Preview** (free tier / $0.075 per 1M tokens)
2. **Fallback: OpenAI GPT-4o-mini** ($0.15 per 1M tokens)

Automatic fallback when Gemini fails or is unavailable.

### Bring Your Own Key (BYOK)

MyFamilyButler can be configured so each family supplies their own free Gemini
API key in the dashboard. This offloads AI processing costs, allowing a single
hosted instance to support thousands of families affordably.

## 🧪 Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
npm test          # Run Vitest tests
```

## 📖 Documentation

Start here:
- [docs/INDEX.md](./docs/INDEX.md) — Canonical documentation map and reading order
- [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) — Implementation guide and commands
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Runtime boundaries and data flow
- [docs/SECURITY.md](./docs/SECURITY.md) — Security controls and incident flow

AI agent system:
- [.agents/README.md](./.agents/README.md) — AI agent system overview
- [.agents/INDEX.md](./.agents/INDEX.md) — Quick reference for all specialized agents

## 🤝 Contributing

Contributions are welcome! Please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md) — How to report bugs, propose features, and open PRs
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — Community standards
- [docs/AI_TOOLING_RULEBOOK.md](./docs/AI_TOOLING_RULEBOOK.md) — Engineering rules and merge gates

Looking for a place to start? Check issues labeled
[`good first issue`](https://github.com/myfamilybutler/myfamilybutler/labels/good%20first%20issue).

## 👥 Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Kkkakania"><img src="https://avatars.githubusercontent.com/u/43632943?v=4?s=100" width="100px;" alt="Weizhou Chen"/><br /><sub><b>Weizhou Chen</b></sub></a><br /><a href="#code-Kkkakania" title="Code">💻</a> <a href="#test-Kkkakania" title="Tests">⚠️</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## 🆘 Getting Help

- **Documentation**: [docs/](./docs)
- **Bug reports & feature requests**: [GitHub Issues](https://github.com/myfamilybutler/myfamilybutler/issues)
- **Security issues**: Please report privately via
  [GitHub Security Advisories](https://github.com/myfamilybutler/myfamilybutler/security/advisories/new)
- **Discussions**: [GitHub Discussions](https://github.com/myfamilybutler/myfamilybutler/discussions)

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

*Last updated: 2026-06-16*
