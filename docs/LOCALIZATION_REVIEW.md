# Localization

The interface supports Simplified Chinese (`zh-CN`), English (`en-US`), and Korean (`ko-KR`). Simplified Chinese is the default.

The active message catalogs are in `src/i18n/messages/`. Locale options are defined in `src/i18n/locale.ts` and exposed on the settings page. Unsupported or missing locale values fall back to Simplified Chinese. Existing `en` values are migrated to `en-US`; other unsupported values fall back to the default.

User-authored poll titles, options, comments, and nicknames are not translated.

Validate the catalogs and app with:

```sh
node --test src/i18n/catalog.test.mjs
npm run build
```

The browser localization flow can be checked with:

```sh
cd tools/browser
npm test -- tests/localization.spec.mjs
```
