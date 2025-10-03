# Olympisch Stadion AI Assistants – Agent Overview

## Purpose
- Internal platform for Olympisch Stadion staff to work with task-specific AI assistants (contract review, event planning, marketing support, etc.).
- Combines conversational workflows with document OCR, voice transcription, and PocketBase-backed session history.

## Front-End Experience (Next.js App Router)
- Landing page at `src/app/page.tsx` handles login, dashboard navigation, and assistant launcher cards.
- Authenticated dashboard offers per-assistant chat workspaces with session history, profile management, and document uploads.
- UI built with shadcn/ui components (`src/components/ui`) and Tailwind styles (`src/app/globals.css`).

## Core Architecture
- **Providers:** `AuthProvider` (`src/providers/auth-provider.tsx`) wraps the app, exposing PocketBase auth state and actions via React context.
- **Hooks:**
  - `use-auth.ts` gives guarded access to auth state and helpers.
  - `use-chat-ocr-enhanced.ts` orchestrates chat streaming, OCR uploads, transcription, and PocketBase persistence per conversation.
- **Components:** Chat surface split across `chat-interface-enhanced.tsx`, `chat-container.tsx`, `chat-input.tsx`, and supporting elements (drag & drop, attachments, markdown renderer, audio recorder).
- **Stateful data:** Conversations and messages sync with PocketBase collections; local React state keeps optimistic UI updates.

## Backend & Integrations
- **PocketBase (`src/lib/pocketbase.ts`):** Handles auth (email/password), session subscriptions, and storing conversations/messages.
- **Mistral APIs:**
  - `/api/chat-enhanced` streams responses from `mistral-medium-latest`, loading per-assistant system prompts from `src/prompts/*.md`.
  - `/api/ocr` and `/api/transcribe` call custom `MistralClient` wrappers for document OCR and voice transcription.
- **Prompts:** Markdown prompt files in `src/prompts/` (mirrored by docs in `docs/prompts/`) define assistant personas.

## Project Layout Highlights
- `src/app/` – App Router pages, layout, and serverless API routes.
- `src/components/` – Chat UI, upload widgets, reusable UI primitives.
- `src/hooks/`, `src/lib/`, `src/types/` – Client hooks, integration helpers, shared types.
- `docs/` – MCP documentation and system prompt references.
- `playground/`, `pocketbase-mcp/` – Experimental scripts and MCP tooling.

## Configuration & Local Development
- Environment variables (set in `.env`): `MISTRAL_API_KEY`, `NEXT_PUBLIC_POCKETBASE_URL`, and PocketBase admin credentials.
- Install dependencies with `npm install` and run `npm run dev`; PocketBase instance must be reachable at the configured URL.
- Tailwind, TypeScript, and Vercel AI SDK are preconfigured (see `tailwind.config.ts`, `tsconfig.json`, `package.json`).

## Extension Ideas
- Harden document retention policies and rate limiting within API routes.
- Expand role-based access controls via additional PocketBase rules and `useHasRole` hook usage.
- Add automated tests around chat flows and PocketBase interactions.
