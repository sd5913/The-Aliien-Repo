# Poll machine translation pilot

Scope: automatically translate saved poll titles, descriptions and all option labels into English when a card, voting page or results page is viewed. Source languages are detected by Google Cloud Translation Basic, per field. Chinese, English and Korean UI settings remain independent; all three offer English/original toggling. There is no human review. Unsupported languages, slang and short/mixed text may fail or be mistranslated; the UI labels translations and retains the original.

Comments, image OCR, image replacement, editor fields and generated share images are outside this pilot. Shared links open pages with automatic translation enabled. Source records and vote IDs are never changed. New and existing saved polls use the same flow; editing text invalidates the translation by content signature. This is on-view translation, not a durable background job at upload time.

## Deployment for testing

1. Enable Cloud Translation Basic in a Google Cloud project and create a server-only API key restricted to the Cloud Translation API. Set an explicit daily character quota for the pilot (billing alerts alone do not stop spending).
2. Configure `GOOGLE_TRANSLATE_API_KEY` in Supabase Edge Function secrets. Never use a `VITE_` variable for this key. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied by the Edge runtime.
3. Deploy `supabase/functions/translate-poll` with the checked-in function configuration. Gateway JWT verification is off to support guests and modern publishable keys. The handler forwards the caller authorization to the existing `get_poll_by_link` RPC; it never uses service-role access. Existing link-access semantics apply, including unlisted polls available to link holders. No database migration is required.
4. Set `VITE_POLL_TRANSLATION_ENABLED=true` in a preview environment and rebuild. It defaults off until the service is configured. Disabling the flag and rebuilding is the rollback.
5. Validate real Japanese, Spanish, Arabic, Chinese, Korean and mixed-language polls, empty descriptions, image-only labels, edits, guests, authenticated voters and service quota failures. Review privacy disclosure for sending poll text (including unlisted link content) to Google for translation before production rollout.

## Caching and limits

Client requests are deduplicated, cached in memory for one hour (up to 200 entries), and time out after 22 seconds. The function rereads the poll under caller access before using its bounded one-hour worker cache. Concurrent requests for identical content share one provider request within a worker. Failed translations are retriable; incomplete or stale responses are rejected as a whole. Loading/failure does not block voting.

The worker limits new provider calls to 30 per minute, accepts only saved poll IDs, and caps content at 6,000 UTF-16 code units and 2–5 options. This is **not a distributed rate limiter**: cold starts and multiple workers can repeat translations and charges. The provider quota is the hard cost guard for the pilot. Production-scale durable caching and distributed throttling are follow-up work; this PR does not promise one paid translation per poll forever.

## Verification

- `npm run build`
- `node --test supabase/functions/translate-poll/handler.test.mjs`
- `npx playwright test --config translation.config.mjs` from `tools/browser`

The automated tests use synthetic database/provider responses and never send poll content to Google. Passing these checks proves application behavior, not translation quality or live deployment. Live provider acceptance requires the configured key and preview deployment above.

### Local results (2026-11-26)

- Production builds with the feature off and on: passed; existing large-chunk warning remains.
- Edge handler: 12/12 passed; strict TypeScript check passed.
- Translation browser scenarios: 9/9 passed, including all three UI languages, original toggling, error retry, stale-response rejection, correct vote IDs, edit invalidation, pending translation and original editing.
- Catalog checks: 3/3 passed.
- Feature-off regression (`localization.spec.mjs` + `results-close.spec.mjs`): 15/18 passed. All 12 result-close scenarios passed. Three localization failures were reproduced unchanged against an isolated `b75cd08` main-branch snapshot: the test account is the poll owner and cannot self-vote; the share test expects obsolete Chinese copy; the auth test expects the removed “Continue with email” button. These existing test issues are not modified by this PR.
- No live provider call, Edge deployment or production enablement was performed.

References: [Google translation request/automatic detection](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate), [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth).
