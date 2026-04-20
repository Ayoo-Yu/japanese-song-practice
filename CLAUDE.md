# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

日语歌练习 App — 渐进式学习日语歌词，从全假名注音到能裸读原文，配合网易云音乐跟唱。

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build (tsc + vite)
pnpm lint         # ESLint
npx tsc --noEmit  # Type check only
```

## Tech Stack

- React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4
- Supabase (auth + DB + cross-device sync)
- 网易云音乐 API (NeteaseCloudMusicApi, deployed separately on Vercel)
- kuroshiro + kuromoji (kanji → furigana annotation, runs in-browser)
- Zustand (state management)
- React Router 7 (client-side routing)

## Architecture

- `src/types/` — Shared TypeScript interfaces (Song, ParsedLine, FuriganaToken, WordMastery, etc.)
- `src/lib/` — Pure logic: `supabase.ts` (client), `netease.ts` (API), `lrc-parser.ts`, `kuroshiro.ts` (furigana), `spaced-repetition.ts` (SM-2)
- `src/stores/` — Zustand stores: auth, player, song, practice, mastery
- `src/services/` — Supabase CRUD wrappers
- `src/components/` — UI by domain: search, lyrics, player, practice, layout
- `src/pages/` — Route-level page components
- `src/hooks/` — Custom React hooks

## Key Concepts

- **5 Practice Stages**: Stage 1 (full aids) → Stage 5 (raw lyrics, KTV mode)
- **Furigana pre-computation**: kuroshiro annotates lyrics once when song is added, stored as JSONB
- **Cross-song word mastery**: Same kanji word shares mastery record across songs (SM-2 algorithm)
- **Stage 3 partial furigana**: Hides readings for words with mastery_level >= 3

## Environment Variables

```
VITE_SUPABASE_URL=       # Supabase project URL
VITE_SUPABASE_ANON_KEY=  # Supabase anonymous key
VITE_NETEASE_API_URL=    # NeteaseCloudMusicApi base URL (deployed on Vercel)
```

## Database (Supabase)

6 tables: `profiles`, `songs`, `user_songs`, `word_mastery`, `line_mastery`, `practice_sessions`. All user-scoped tables have RLS policies.
