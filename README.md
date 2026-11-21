# SpeakLab Academy — A Living English Adventure

**Live site:** https://shellshock9001.github.io/ielts-speaking-studio/

A free, independently built, **playable 3D woodland school** for English learners. One continuous React/Three.js world contains 11 themed districts, 44 named student characters, seven faculty members, the original 44 IELTS Speaking Part 2 topics, 178 cue points and 132 Part 3 questions. Lessons remain in the game rather than opening external worksheets.

This repository is static-hosted on GitHub Pages. There are no paid subscriptions, third-party script CDNs, Supabase dependencies or required accounts.

## A world with real actions and consequences

Movement is not the only gameplay. The player can **explore → choose equipment → use it on an actual object → receive an animation and authored sound → collect or transform something → save progress → unlock further goals**.

Five visible, modeled tools correspond to real simulation rules:

| Tool | Action | World outcome |
| --- | --- | --- |
| Gather | Pick fruit or harvest mature flowers | Berries, petals, seeds and XP |
| Butterfly Net | Time a swing near a fluttering butterfly | Catch a district-specific creature or miss |
| Spade | Uncover a relic or plant a flower seed | Curio discovery or newly planted garden |
| Watering Can | Tend an unwatered flowerbed | Timed growth into a harvestable bloom |
| Fishing Rod | Cast near the pond and reel during the bite window | Fish added to the field guide and bag |

Craft bouquets from actual gathered ingredients, give them to classmates, grow individual friendships, and watch friendship markers appear above their in-world characters. A physical inventory preserves materials. **The 38-slot Field Guide** records distinct district butterflies, curiosities, flowers and fish, rewarding the first 3, 8, 15, 24 and all 38 unique discoveries. Explorer XP advances outfits. Three rotating, date-scoped daily missions count actual actions and grant acorns when completed. Furniture built with acorns changes the world permanently. Repeated harvesting of a collected resource is limited until the next day; learning exercises remain replayable without limit.

All game state—including collected objects, garden timing, acorns, equipment, world position, discoveries, relationships and lesson work—is local to this browser. Use the storybook to export/import progress. Clearing browser data will remove progress if it wasn't exported.

## English learning within the same world

Each of the 44 IELTS speaking topics belongs to a distinct woodland student. Their conversations cover personal examples, opinions, reasons, counterpoints and saved replies. Seven faculty guide the rest: Professor Maple teaches in-world lessons, Quill handles spaced recall, Ada conducts timed three-part speaking rehearsals, Bloom teaches word retrieval, Caramel runs construction, Fable guides exploration and Glitter hosts the speaking festival.

The academy contains teacher-led classrooms with models, grammar, pronunciation and photo observation; Flower Harvest; a four-beat Story Trail; Reasoning Run; speaking lanterns; five hidden phrase-retrieval seeds in each district; a spaced memory library; an atlas; a workshop; a storybook; and a full simulated interview with manually entered feedback.

**Game points do not equal an IELTS band.** The experience does not fabricate automatic pronunciation grades or AI-written classmate responses. Microphone audio is browser-local; download your recording if you want to keep it.

## Controls — desktop, touch and gamepad

| Input | Real gameplay action |
| --- | --- |
| **WASD / arrows** | Walk relative to the orbiting camera |
| **Shift** | Sprint, consuming and regenerating stamina |
| **Ctrl / C** | Hold to sneak / toggle sneak |
| **Space / Alt** | Jump / dodge with cooldown and follow-through |
| **E / F / G / V** | Talk / use equipped tool / give a bouquet / wave |
| **1–5 / Tab** | Equip one of five 3D tools / cycle tools |
| **I / B / Q** | Inventory and crafting / creature field guide / daily missions |
| **M / J / H / Esc** | World atlas / learning storybook / game controls / close |
| **Z** | Recenter camera |
| **Right-drag / scroll** | Orbit / zoom camera |
| **Mouse click** | Walk to a world point, classmate, resource, puzzle object or destination |

**Gamepad:** left stick moves; right stick orbits; A jumps, B dodges, X interacts, Y uses equipment, bumpers cycle the quick belt, trigger sprints, Start shows missions, Back opens the bag. Mouse, keyboard and a pointer-captured thumbstick have direct game actions; desktop also displays a usable directional pad. Phones/tablets receive touch-friendly movement and action controls, responsive notebook sheets and safe-area-aware layouts.

Without WebGL, a 2D mode keeps every teaching activity, resource rule, crafting, collection, gifting and fishing accessible without presenting fake nonfunctional movement buttons.

## Original sounds authored by Vision

The **58 original stereo sound cues** were actually defined and rendered through Vision's audio studio—not selected from a stock effects list. Original editable layered sound scores live in `audio-sources/wildwood/`; 48 kHz, 16-bit stereo WAVs live in `public/audio/wildwood/`; reproduce the design process using `scripts/vision-score-world.mjs`. The scores contain modal resonators, frequency-modulated materials, independent surface-air/noise layers, stereo answers and individually shaped envelopes.

Each district has its own acoustic arrival and all major actions have distinct sound: movement, footsteps, takeoff and landing, sprint, sneak, roll, butterfly net, harvesting, soil, watering, growth, fishing, gifting, crafting, assessment, conversations, library, festival, tools, quests and more. Playback uses one shared Web Audio context with finite voices, separate semantic families, cancellation and compression. Sound starts on the **first eligible user gesture**, honors persistent mute and volume settings, and is suppressed during microphone capture. Browsers cannot start audio before user interaction.

Vision waveform/render verification proves the authored assets, not subjective listening quality. Headphone/device listening remains a separate QA requirement.

## Privacy, offline use and hosting

No learner audio is uploaded. No automatic cross-device sync exists. The versioned service worker caches the compiled game and source learning material for later offline visits and caches audio on first use. Repeated visits after successful installation can work offline; first-time play requires a reachable origin.

GitHub Pages availability **is not guaranteed in mainland China**. A real test from a mainland network or verified alternate host is required before promising availability.

## Build and verification

```sh
npm ci
npm test
npm run build
npm run dev
# http://127.0.0.1:5174/ielts-speaking-studio/

node scripts/academy-gameplay-smoke.cjs
node scripts/academy-smoke.cjs
node scripts/academy-extended-smoke.cjs
node scripts/academy-spatial-smoke.cjs
node scripts/academy-audio-smoke.cjs
node scripts/academy-responsive-smoke.cjs

npm run preview -- --port 4174
# use SPEAKLAB_BASE=http://127.0.0.1:4174/ielts-speaking-studio/
node scripts/academy-offline-smoke.cjs
```

Tests assert the preservation of every source IELTS topic and expression, all layered sound files and checksums, real WebGL movement, equipment and action results, timed planting/fishing/catching, one-time rewards, saved quests, NPC interactions, microphone recording, honest scoring, mobile/tablet layouts, service worker offline boot and local persistence. Playwright uses an installed Edge or Chromium; set `BROWSER_EXECUTABLE` for another path.

GitHub Actions builds, runs source tests and publishes the static `dist/` folder from `main`. Real production verification requires seeing the workflow succeed and testing the live URL.

## Originality

The world, characters, scene geometry, action systems and sound performances are original work for this academy. They are not copied from an existing commercial game. The site is not affiliated with the IELTS owners.
