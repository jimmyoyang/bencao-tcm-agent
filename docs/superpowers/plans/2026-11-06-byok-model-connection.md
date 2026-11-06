# BYOK-only Model Connection Implementation Plan

**Goal:** Require each visitor to supply their own API configuration; remove all shared author model calls.

**Architecture:** Browser-memory model adapter, direct HTTPS fetch, native settings dialog, existing RAG validation and local emergency routing. No default or fallback provider.

- [x] Implement Responses and Chat Completions adapters and tests.
- [x] Reject failed/incomplete output and invalid connection-test responses.
- [x] Clear credentials on page exit, explicit clear and all-data clear; cancel stale tests.
- [x] Remove PopSDK calls and default model; require API setup before ordinary questions.
- [x] Disable the existing POPO oneapi service and read back enabled:false.
- [x] Verify browser setup, saved question retry, refresh, no fallback and local emergency message.
- [x] Update public documentation and mobile screenshot for BYOK-only behavior.
- [ ] Run final tests/build and code review, then merge and push main.
- [ ] Publish the existing POPO work, verify external access and capture the live settings screenshot.
