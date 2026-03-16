# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains an AI Interview Practice Bot for Indian students.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2, gpt-4o-mini-transcribe, TTS)

## Application

**AI Interview Practice Bot** — A full-stack voice-based interview simulator for Indian students:
- Select from 5 domains: Software Dev, Data Science, AI/ML, HR/Behavioral, General Aptitude
- AI asks questions via text-to-speech (alloy voice)
- User records answers via microphone (useVoiceRecorder hook)
- AI transcribes speech to text
- AI evaluates answers with score/10, strengths, improvements, sample better answer
- Feedback spoken aloud via TTS
- 10 questions per session with timer and progress tracker
- Final performance report with grade, summary, recommendations

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (interview routes + AI)
│   └── interview-bot/      # React + Vite frontend (dark mode UI)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side client (TTS, STT)
│   └── integrations-openai-ai-react/  # React hooks for voice recording
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Endpoints

All under `/api/interview/`:
- `POST /start` — Start session, get first question
- `POST /transcribe` — Speech-to-text (base64 audio → text)
- `POST /evaluate` — Evaluate answer with GPT-5.2 → score/feedback JSON
- `POST /next-question` — Get next AI-generated question
- `POST /tts` — Text-to-speech (text → base64 mp3)
- `POST /report` — Final performance report generation

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI proxy URL (auto-provisioned)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI key (auto-provisioned)
- `DATABASE_URL` — PostgreSQL connection (if DB used)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`).
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Running Codegen

After changing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```
