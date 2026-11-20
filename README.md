# SpeakLab — Free IELTS Speaking Studio

A free, fully static and interactive IELTS Speaking study resource built from the supplied 12-week instructor curriculum and its 44-topic question bank. Designed for GitHub Pages with **no server, no database and no runtime service account**.

## Features

- 11 thematic lessons and a Week 12 mock assessment
- All **44 original speaking topics**, **178 Part 2 cue-card prompts**, **132 Part 3 discussion questions**
- Original visual prompt pack (six photo scenes), group discussion prompts
- Vocabulary flashcards with pronunciation via built-in browser speech synthesis
- Contextual fill-in-the-blank exercises
- Guided cue-card planning and model response reveal
- Part 2 preparation and speaking timers (60s / 120s)
- Microphone recording with local playback and download (browser-dependent)
- Part 3 answer notes and debate planning
- Spaced recall schedule for 55 expressions
- Week completion, topic progress, mock interview score history
- JSON export/import for moving browser progress between devices

## Data and privacy

All learner notes and assessment results use browser `localStorage` on the device. No user accounts, cross-device synchronization, teacher portal, cloud database or auto-scoring. Microphone recordings are held temporarily in browser memory for download and are **not uploaded nor automatically persisted**. Students should download recordings and export progress regularly. Clearing browser data may remove progress.

## Hosting

Publish from the repository's `main` branch, `/ (root)` using GitHub Pages. No build, Node installation or external services needed. The `.nojekyll` file disables Jekyll processing. Front-end assets are relative to the repository path.

Local preview: `python -m http.server 8080`, then visit `http://localhost:8080`.

## Educational integrity

This is an **independent study tool**, not an official IELTS product. The practice-scoring UI tracks teacher or learner assessments using the four IELTS Speaking criteria but **does not calculate or guarantee an official band**. Consult current official IELTS band descriptors for formal evaluation.

## Source

The lesson structure and question data were transcribed from the user-provided 52-page *English Speaking Masterclass — Complete Curriculum and Question Bank*. The six illustration photos were generated for this project. External site font requests are optional; system fonts provide a working fallback.
