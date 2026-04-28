# Carousel;IN

Turn a LinkedIn post into a swipeable carousel that looks like a magazine.

Free, BYOK Lab tool. Sibling of [TL;IN](../linkedin-drafter).

## Run locally

```bash
npm install
npm run dev
```

App boots at `http://localhost:3000`.

## Stack

- Next.js 16 App Router, React 19, Tailwind v4
- Anthropic Claude (BYOK) for slide-breakdown
- Client-side `html-to-image` + `jsPDF` for carousel rendering

## Status

Stage 0 scaffold. See `FEATURE_CAROUSEL_IN.md` for the design spec and build order.
