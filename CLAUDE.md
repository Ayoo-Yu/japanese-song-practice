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
- 网易云音乐 API (proxied via Vite dev server to music.163.com)
- kuroshiro + kuromoji (kanji → furigana annotation, runs in-browser)
- Zustand (state management)
- React Router 7 (client-side routing)
- All data stored in localStorage (no backend required)

## Architecture

- `src/types/` — Shared TypeScript interfaces (Song, ParsedLine, FuriganaToken, etc.)
- `src/lib/` — Pure logic: `netease.ts` (API), `lrc-parser.ts`, `kuroshiro.ts` (furigana), `spaced-repetition.ts` (SM-2)
- `src/stores/` — Zustand stores: player, song, practice, mastery
- `src/services/` — localStorage CRUD wrappers
- `src/components/` — UI by domain: search, lyrics, player, practice, layout
- `src/pages/` — Route-level page components
- `src/hooks/` — Custom React hooks

## Key Concepts

- **5 Practice Stages**: Stage 1 (full aids) → Stage 5 (raw lyrics, KTV mode)
- **Furigana pre-computation**: kuroshiro annotates lyrics once when song is added, stored in localStorage
- **Cross-song word mastery**: Same kanji word shares mastery record across songs (SM-2 algorithm)
- **Stage 3 partial furigana**: Hides readings for words with mastery_level >= 3

## Environment Variables

```
NETEASE_MUSIC_U=    # NetEase Cloud Music session cookie (optional, for VIP songs)
```

## Data Storage

All data is stored in browser localStorage under key `jpsong_songs`. No server database required.
