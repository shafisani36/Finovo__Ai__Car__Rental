# Finovo About Us — Organized Project

This is the reorganized version of the supplied About Us page. The existing design and `src/styles.css` were intentionally kept unchanged; the large page was split into smaller React components and image references now import the real PNG files from `src/assets`.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To check a production build:

```bash
npm run build
```

## Component map

Main page and sections:
- `src/routes/index.tsx` — route setup, page composition, page metadata, and the notice dialog.
- `src/components/about/SiteHeader.tsx` — desktop/mobile navigation and header controls.
- `src/components/about/HeroStory.tsx` — hero banner, company story, stats, and overlapping photos.
- `src/components/about/MissionVision.tsx` — mission and vision panels.
- `src/components/about/WhyChooseUs.tsx` — benefits data and benefit cards.
- `src/components/about/TeamSection.tsx` — team portraits and ribbon.
- `src/components/about/JourneyCTA.tsx` — call-to-action section.
- `src/components/about/SiteFooter.tsx` — footer, social links, contact details, and app buttons.
- `src/components/finovo.tsx` — shared Finovo brand and app-store buttons.
- `src/components/ui/` — existing reusable UI primitives used by the page.

Styles:
- `src/styles.css` — original design styling, retained without intentional visual redesign.
- `src/assets/` — local PNG images imported directly by components.

## PNG image mapping

- `finovo-logo.png` / `finovo-footer-logo.png` — header and footer branding (`src/components/finovo.tsx`)
- `finovo-avatar.png` — account avatar (`SiteHeader.tsx`)
- `finovo-hero.png`, `finovo-steering.png`, `finovo-road.png` — hero/story section (`HeroStory.tsx`)
- `finovo-mission.png`, `finovo-vision.png` — mission/vision (`MissionVision.tsx`)
- `finovo-shield.png`, `finovo-car.png`, `finovo-support.png`, `finovo-calendar.png` — benefit cards (`WhyChooseUs.tsx`)
- `finovo-team-ribbon.png`, `finovo-team-one.png`, `finovo-team-two.png`, `finovo-team-three.png` — team section (`TeamSection.tsx`)
- `finovo-journey.png` — journey CTA (`JourneyCTA.tsx`)
- `finovo-google-play.png` — Google Play button (`src/components/finovo.tsx`)

The `node_modules` directory is intentionally not included in this ZIP. Run `npm install` after extracting.
