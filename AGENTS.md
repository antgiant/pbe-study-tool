# AI Agent Instructions

## Project Overview
- PBE Study Tool for practicing Pathfinder Bible Experience fill-in-the-blank questions.
- Frontend app with HTML/CSS/JS and supporting JSON data files.
- Core logic lives in `src/` and is covered by Vitest tests in `tests/`.

## Tech Stack
- JavaScript (ES modules)
- Vitest for unit/integration testing
- IndexedDB (via `src/database.js`)

## Key Files
- `index.html`, `script.js`, `styles.css`: main UI and behavior.
- `src/utils.js`: pure functions for text processing and scoring.
- `src/database.js`: IndexedDB storage helpers.
- `tests/`: Vitest test suite (unit + integration).

## Testing Requirements
- Maintain at least 90% overall test coverage.
- Run coverage with: `npm run test:coverage`.
- Add or update tests alongside code changes to keep coverage above target.

## Contribution Guidelines for AI Agents
- Prefer small, focused changes with matching tests.
- Keep changes consistent with existing coding style and project structure.
