# Make.com integration
- [x] Silent visible-tab posts polling every 5 seconds.
- [x] Real diagnostic callback, onboarding events, refresh polling and LinkedIn fields.
- [x] Shared webhook URL and hidden per-user URL card.
- [x] Verify rules and authenticated flows; preserve schema and posts callback.
- [x] User setup: MAKE_WEBHOOK_URL is configured.
# Onboarding and LinkedIn PDF
- [x] Restore completed onboarding with refazer=1 and preserve complete answers.
- [x] Add optional other experiences and keep mobile controls reachable.
- [x] Extract LinkedIn PDF locally, save text, and show conditional posts reminder.
- [x] Test limits and merges; verify authenticated restart, mobile clicks and local PDF extraction without changing the user's saved answers.

# LinkedIn material and generation cadence
- [x] Parse Portuguese/English PDFs into editable profile fields and collapse full text.
- [x] Add optional local PDF or reference link before onboarding questions.
- [x] Share saved cadence controls on diagnosis/posts and save before generation.
- [x] Run unit tests and authenticated mobile flow checks (PDF upload and cadence readback; no external generation requested).
