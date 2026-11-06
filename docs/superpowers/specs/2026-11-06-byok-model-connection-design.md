# BYOK-only model connection design

## Goal
Every real model conversation requires the visitor's Base URL, API Key, model ID and protocol. There is no author-funded default or fallback.

## Data and transport
Configuration stays only in page memory. Closing the dialog clears the unsaved key draft. Page exit, refresh and explicit clear remove the configuration. Requests go directly from the browser to the configured HTTPS endpoint. Loopback HTTP is permitted for controlled tests. Redirects, cookies and referrers are disabled. Responses requests set store:false; provider retention rules still apply.

Keys are excluded from history, export, browser storage, logs and source control. Visitors must trust the page and provider. Providers must allow CORS from the published page.

The POPO oneapi service is disabled and read back as enabled:false. This does not revoke the original provider key. The frontend has no PopSDK model call.

## Interaction
Without configuration, ordinary questions are retained and the setup dialog opens. After saving, the visitor can retry the question. Local emergency guidance is shown without requiring a key.

Setup contains protocol, Base URL, key, model ID, connection test, save and clear. Tests send only a minimal synthetic message and validate readable model text; they time out after 20 seconds. Closing, clearing or editing cancels pending tests. No credentials are prefilled.

## Validation
Cover no-configuration zero requests, clear and refresh, no fallback on errors, both protocols, failed/incomplete streams, false-positive test responses, mobile and desktop forms, retrying the retained question, and unchanged local emergency routing. Existing RAG validation remains mandatory.
