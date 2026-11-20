# SpeakLab Wildwood · IELTS Speaking Adventure

Live: **https://shellshock9001.github.io/ielts-speaking-studio/**

An original, **free**, static-hosted English-speaking game and structured IELTS practice course, built with React, TypeScript, Three.js and React Three Fiber. No account, paid backend, external fonts, CDN-hosted code, Supabase or subscriptions. The game world and lesson areas use one shared visual language, while their educational tasks remain distinct.

## Playable village

This is a game, not a decorative 3D menu. A physically controllable woodland character explores an island with collisions, a follow camera, paths, 3D companions, hidden word seeds, quest signs, animated stations and a live reward system. Clicking a world object or a quest destination **moves the character toward it**; choosing an activity doesn't teleport the player away.

Eleven chapters have individual color palettes, wildlife guides and sculpted landmark sets: Friendship Orchard, Curiosity Workshop, Courage Canyon, Whispering Wetlands, Wanderlight Harbor, Starlit Picture House, Letterbird Village, Together Town Square, Clockwork Meadow, Mooncake Festival, and Skyward Observatory. Each chapter uses the original prompts and expressions for that lesson. Finding more words and completing quests changes the player's outfit and grows their personal adventure progress.

**Village Workshop:** students spend earned acorns on a Wildflower Garden, Storytime Bench, Conversation Picnic or Moonlight Arch. Each is an original 3D prop placed in that chapter's meadow, visible immediately and preserved across visits. The shop prevents duplicate purchases, derives available currency from earned rewards and saved furnishings, and never asks for money or an account. Learners gain acorns by improving quest best scores and discovering word seeds, rather than through payment.

The four repeatable gameplay modes are:

| Game | What the learner actually does | Educational basis |
| --- | --- | --- |
| Word Harvest | Walk into the correct flower among three choices across five rounds; wrong routes have a points cost | Retrieval practice, semantic discrimination, immediate corrective feedback |
| Story Trail | Build and navigate a connected four-beat route on one cue-card topic, saving the assembled clues | Narrative sequencing, contextual recall, preparation for the IELTS Part 2 long turn |
| Reasoning Run | Enter the correct argument gate across four rounds and build position → reason → example → nuance | IELTS Part 3 argument structure, elaboration, relevance |
| Voice Lanterns | Give sustained, audible speech into the microphone to light four actual real-time 3D lanterns, review and download the result | Speaking fluency and confidence; **voice activity is not pronunciation scoring** |

The village additionally contains **five collectible language seeds per chapter**. Discover one in the 3D world, retrieve its phrase from a meaning prompt, and keep the reward. NPC conversations let learners respond in their own words, give examples and save responses. Results, best scores, chapter completion, collected seeds, saved conversations, story routes, furniture, writing notes and evaluations persist in the local learning journal. Quest points and acorns are game rewards, **not IELTS bands**.

## How to control it

- **Desktop:** WASD or arrow keys to walk; hold Shift to run; E to talk to a nearby guide or enter an activity. Click a ground destination, a glowing sign, a collectible, an NPC, or a quest in the sidebar to walk toward it.
- **Phone/tablet:** on-screen directional pad, Talk/Explore and Run controls. Large touch targets. Quest choices bring the play area back into view. The game has been exercised at 320px and larger widths without horizontal overflow.
- **Low-powered or WebGL-disabled devices:** a 2D accessible mode keeps the full learning rules, question choices, hidden words, conversation activities and progress usable. This deliberately substitutes controls for spatial movement.
- **Reduced-motion preference:** unnecessary decorative transitions are suppressed without preventing essential game movement.
- **Audio:** toggle on the app header to hear four original multi-layer Vision-authored sound cues (arrival, harvest, station travel, completion). Sounds are optional and suppressed during learner microphone recording. No copied game sounds or stock click samples.

The 3D canvas is retained across lesson navigation, avoiding reinitialization when returning to play. Its animation loop pauses when the stage is offscreen or the document is hidden. Rewards and camera follow motions continue while the canvas is visible, including during celebration screens.

## Structured English curriculum

The source question bank from the supplied teaching screenshots has **44 unique Part 2 topics, 178 cue points and 132 Part 3 discussion questions**. It is divided into 11 thematic teaching chapters and Week 12 mock speaking practice. This is separate from the game and includes photo observation, vocabulary matching, phrase recall, written planning, timed speaking, browser-local recordings, teacher/self-assessment notes, spaced retrieval, model narratives, grammar and pronunciation guidance.

Students are encouraged to form their own responses; game completion alone doesn't measure real-world speaking proficiency. The mock offers the four IELTS Speaking rubric categories for **human observations**, not automatic band grading. SpeakLab is not affiliated with IELTS test owners.

## Progress, privacy and hosting limitations

Progress is saved in this browser using localStorage and can be **exported/imported as JSON** in Settings. Recordings remain local and must be downloaded before leaving the session. No student audio is uploaded. Clearing browser storage can erase local progress. Cross-device sync is not implemented.

All runtime scripts, content, photography and original audio are self-hosted in the project. After the first successful visit, a versioned service worker caches the compiled application and media for repeat **offline study**.

**China access:** GitHub Pages availability cannot be guaranteed in mainland China. The exact URL was submitted to GreatFire on November 20, 2026, but the service returned no conclusive measurement at that time. A mainland-network test of this exact URL and/or a separately hosted mirror is needed before promising access to Chinese students. Offline caching cannot solve first-time access if the origin is blocked.

## Local development

```bash
npm ci
npm run dev
# http://127.0.0.1:5174/ielts-speaking-studio/

npm test
npm run build
npm run preview -- --port 4174
```

Use the local production preview when running browser end-to-end tests:

```bash
node scripts/game-smoke.cjs
node scripts/game-extended-smoke.cjs
node scripts/game-voice-smoke.cjs
```

Browser tests use Playwright Core and a locally installed Edge/Chromium executable. On nonstandard setups set `BROWSER_EXECUTABLE` and `SPEAKLAB_BASE`. `game-smoke.cjs` validates real WebGL movement, click-to-walk, five-round harvesting, reward-based 3D construction, all eleven biomes, route retention and 320px touch controls. `game-extended-smoke.cjs` exercises seed retrieval, saved conversations, story and debate progression, simulated mistakes, village building and the accessible no-WebGL mode. `game-voice-smoke.cjs` builds a temporary controlled mono microphone fixture from SpeakLab's own authored audio and checks four-lantern completion. Temporary screenshots and fixtures live in `analysis/` (ignored by Git).

GitHub Actions runs `npm ci`, `npm test`, a production build, and deploys the `dist/` folder to GitHub Pages on main. All links use a project-relative base path and hash routes to avoid static-hosting 404s.

## Original assets

All stylized animals, landmarks, mini-games, expressions and sound compositions are produced for this educational project. They adopt the broad genre of cozy exploration without copying Animal Crossing characters, game assets, music, or branded presentation. Four authored stereo sound scores live in `audio-sources/` and mastered WAV files in `public/audio/`; see `scripts/master_audio.py`. Production compilation and signal checks are automated; artistic audition on target devices remains a separate quality check.
