# SpeakLab Village — Your English Adventure

**Free, independent, original 3D IELTS Speaking learning world.**

Live: https://shellshock9001.github.io/ielts-speaking-studio/

Built with React 19, TypeScript, Vite, React Three Fiber and Three.js. Four interactive locations lead directly to educational work: Word Garden (3D flower selection, retrieval practice and meaning matching), Story Cottage (Part 2 planning and sequencing), Speaking Dock (timed response and recording), and Debate Bridge (Part 3 reasoning). Saved achievements grow the village garden.

The original woodland characters, geometry and sounds were authored for this project. No imagery or audio is copied from existing games.

## Curriculum and exercises

The verified course bank contains 44 unique original Part 2 topics, 178 cue points and 132 Part 3 discussion questions. The 12-week curriculum includes 11 thematic lesson units and a final mock speaking assessment, visual observation tasks, matching, phrase gap fills, spaced repetition, story sequencing, speaking timers, private microphone recordings, and scored practice notes.

Speaking scores record teacher or learner observations against the four IELTS Speaking criteria. The site does not calculate an official IELTS band and is not associated with IELTS test owners.

## Free hosting, privacy and China access

GitHub Pages serves the site with no paid API, account database, Supabase or third-party CDN. Every script, photo, CSS and audio file is bundled locally. Student notes, assessments and progress remain in browser localStorage; export/import JSON to move them. Recordings must be downloaded to keep them; they are not transmitted. Clear site data and you may lose progress.

The core React interface renders separately from the optional 3D engine, with an accessible illustrated station fallback. A single 3D renderer is retained across page navigation and pauses while offscreen, in a hidden tab, or under the reduced-motion preference. The lesson rail and 3D station controls share URL state, including browser history and deep links. Story plans and speaking notes persist.

After one successful visit, a release-versioned service worker can cache learning content for subsequent offline study. It cannot fix inaccessible first-time requests.

**Mainland China is not guaranteed**: independent GreatFire measurements show github.io reachability varying between blocked, available and intermittent subdomains. On November 20, 2026, the exact SpeakLab URL was submitted for a new GreatFire probe, but the API returned `not enough data` with zero conclusive tests at verification time. An ITDOG test was blocked by the testing service's bot verification. These results do not prove the site accessible or inaccessible. Students should check the exact site on Chinese networks. Separate China-reachable hosting may be needed; bundling and caching avoid known external Google/CDN dependencies.

## Development and deployment

- Run: npm ci; npm run dev
- Development URL: http://127.0.0.1:5174/ielts-speaking-studio/
- Tests: npm test
- Production build: npm run build
- Browser smoke test: node scripts/site-smoke.cjs (requires a compatible Chromium/Edge browser and Playwright Core)
- GitHub Actions builds the public dist directory on main and deploys via GitHub Pages.

The app uses hash navigation so deep links remain on the one static HTML entry point.

## Original sound design

Four separate authored, multi-layer stereo cues appear in audio-sources and public/audio: arrival, bloom, turn, celebrate. Scores were constructed with Vision sonic design, with wood/modal, FM and botanical air performance roles instead of generic samples. scripts/master_audio.py adjusts playback levels without changing source scores. Sound is opt-in and pauses while the microphone is recording. The render pipeline passed signal checks; human listening approval on actual devices remains outstanding.

Six original visual prompt photos were generated specifically for this project.
