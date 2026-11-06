# BYOK Model Connection Implementation Plan

> **For agentic workers:** Implement task-by-task with tests and verification.

**Goal:** Add a browser-only user-provided API mode while preserving the existing POPO model mode.

**Architecture:** A new model adapter owns in-memory BYOK configuration, endpoint normalization, protocol-specific requests, and mode status. The UI exposes a native dialog; the existing app calls the adapter and the existing response validator remains the final safety gate.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node test runner, existing POPO PopSDK.

---

### Task 1: Add model adapter tests and implementation

**Files:**
- Create: public/model.mjs
- Create: tests/model.test.mjs

- [x] Test URL normalization for Responses and Chat Completions, HTTPS enforcement, and localhost exception.
- [x] Test configuration lifecycle does not write to browser storage.
- [x] Test request selection uses direct fetch for BYOK and PopSDK otherwise.
- [x] Implement the smallest adapter with in-memory configuration and redacted error categories.
- [x] Run `node --test tests/model.test.mjs`.

### Task 2: Support Responses API response formats

**Files:**
- Modify: public/core.mjs
- Modify: tests/core.test.mjs

- [x] Add tests for non-stream Responses output_text and SSE response.output_text.delta.
- [x] Extend readCompletion without changing Chat Completions behavior.
- [x] Run core tests.

### Task 3: Add model connection UI

**Files:**
- Modify: public/index.html
- Modify: public/style.css
- Modify: public/app.js

- [x] Add model connection status and settings dialog with protocol, Base URL, key, model, save, test, clear.
- [x] Keep all key values in module memory only and clear the form after clear.
- [x] Route real requests through the adapter, update status and error text.
- [x] Add tests for required UI labels and no persistence claims.

### Task 4: Update public documentation and version

**Files:**
- Modify: README.md

- [x] Document POPO demo mode and BYOK mode, CORS requirement, memory-only key handling, supported paths, and limitations.
- [x] Add a version entry and remove any wording implying every visitor must use the author's quota.
- [x] Run grep checks to ensure no API key appears.

### Task 5: Full verification and delivery

- [x] Run npm test, npm run build, npm run evaluate.
- [x] Run browser fixture checks and inspect git diff.
- [ ] Commit changes, push and merge main, publish through the existing POPO upload script, and verify the external page.
