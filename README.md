# CineVerse

A cinematic movie-discovery app with a responsive React/TypeScript web client, a restricted Node TMDB proxy, device-local guest library, and a generated Capacitor Android project. No backend database, user accounts, ads, subscriptions, trackers, or full-movie streaming.

**Release status:** the production web build and local test evidence are in `docs/QA.md` and `evidence/`. An authenticated TMDB connection still requires your own credential. Android source/configuration is included; no APK or AAB is claimed unless a real artifact is included. See the limitations below before deploying publicly.

## 1. Requirements

- Node.js 22.12+ (tested with Node 24), npm, network access to TMDB.
- A TMDB API Read Access Token (preferred) or v3 API key.
- Android builds: Android Studio, Android SDK Platform 36, compatible build tools, JDK **21**, and the included Gradle wrapper. Capacitor 8 uses Android 7.0+ (API 24 minimum).

## 2. Secure TMDB configuration

1. Sign in to TMDB. In account settings choose **API**. Apply for a developer credential if needed; existing users can find their **API Read Access Token** there.
2. Read the official application-authentication documentation: https://developer.themoviedb.org/docs/authentication-application
3. `cp .env.example .env`
4. Open `.env` in a private editor. Set **one** of `TMDB_READ_TOKEN` (without a `Bearer ` prefix) or `TMDB_API_KEY`. Leave the other blank.
5. `npm ci`
6. `npm run check:live` — this must actually succeed before claiming the integration has been validated. It calls TMDB `/3/configuration` and never logs the credential.
7. `npm run dev` — open the Vite URL printed in the terminal (normally http://127.0.0.1:5173). Node API runs on 127.0.0.1:8787.
8. Open **Settings → Validate connection**. The app retrieves TMDB configuration, genres, languages, and countries. No credential-entry form exists in the browser.

Secrets belong ONLY in the proxy's runtime environment or hosting secret manager. `.env` and signing keystores are ignored by Git. **Never name a secret `VITE_...`: Vite embeds that prefix into public client assets.** Do not put TMDB secrets in an APK or public source. The Android client calls your HTTPS proxy and contains no TMDB credential.

Without a credential the app deliberately displays an actionable setup state, not invented films, ratings, images, or trailers. You can still create collections and manage/import an existing local library.

## 3. Production web build

```sh
npm run build
npm start
```

Serve the Node process behind a TLS reverse proxy. Set `HOST=0.0.0.0` in containers or private service networks, not indiscriminately on an unprotected machine. `PORT` defaults to 8787. The process serves `dist/` and `/api/*` from the same host; hash routing works without rewrite configuration. Direct `/movie/123`, `/tv/123`, and `/person/123` paths also load via the app shell.

Set `ALLOWED_ORIGINS` to exact origins, comma-separated, including your HTTPS website and `https://localhost` if distributing the Android client. With a TLS-terminating reverse proxy, the explicit HTTPS website origin is necessary because Node itself receives HTTP. CORS is **not authentication**. This intentionally public discovery proxy is limited to read-only TMDB endpoints, but can still be called by non-browser clients. Use edge rate limits, quota monitoring, request-size limits, and abuse protection before a public launch. The built-in conservative limiter counts socket IPs (not untrusted forwarded headers); behind a proxy clients may share the same bucket. Tune edge limits to your usage and TMDB agreement.

Example Docker deployment:

```sh
docker build --build-arg VITE_PUBLIC_APP_URL=https://movies.example.com -t cineverse .
# Provision secrets in a private runtime env file or your hosting secret manager.
docker run --env-file .env -e HOST=0.0.0.0 -p 127.0.0.1:8787:8787 cineverse
```

Replace the example domain with yours. The examples are instructions, not an existing deployment. Do not put credentials in Docker build args. If you host the static client separately, set public `VITE_API_BASE_URL` to the HTTPS proxy URL **before building**, and add that client origin to the proxy allowlist. Serve an equivalent CSP with `connect-src` permitting only that proxy origin. The bundled Node CSP assumes same-origin web hosting.

## 4. Android

See `docs/ANDROID.md`. The `android/` directory is a real generated Capacitor 8 project, not a screenshot wrapper. Bundled assets share the tested web implementation; Capacitor adds network-state events, native share, splash screen, app lifecycle/deep-link handling, and back navigation. This was chosen to maintain one functional client across web and Android rather than two diverging implementations. It is **not a native Kotlin/Jetpack Compose UI**, and native-device QA remains required.

```sh
# Public, non-secret build-time values. Use your real HTTPS deployment.
export VITE_API_BASE_URL=https://movies.example.com
export VITE_PUBLIC_APP_URL=https://movies.example.com
npm run android:sync
npm run android:open
```

There is no runtime `server.url` redirect: the application assets ship inside the app. A production server is still required for metadata requests. No cleartext networking is permitted. The manifest requests INTERNET and ACCESS_NETWORK_STATE only. Android backup is disabled to avoid unexpectedly exporting private guest notes.

## 5. Testing

```sh
npm test                 # Domain, import/share, proxy auth, caching, errors and security
npm run build            # TypeScript checks + optimized Vite build
npm run test:e2e          # Local Chromium browser checks with SYNTHETIC TMDB fixtures
npm run check:live        # Real authenticated TMDB configuration check (requires credential)
```

Browser tests use `CHROMIUM_PATH` if set, otherwise `/usr/local/bin/chromium` in the supplied environment. Set it to your installed Chrome/Chromium executable on other machines. `tests/e2e.mjs` starts its own localhost server and writes `artifacts/e2e-results.json` and screenshots. Test fixtures are defined only under `tests/`; the application never imports them. A mocked success is not live TMDB or YouTube playback evidence. Browser tests are not Android-device tests.

## 6. Architecture

- `src/App.tsx`, `components.tsx`, page modules: interface, navigation, guest context.
- `src/api.ts`: typed client, abort/timeout handling, in-memory cache, offline response fallback, image construction from TMDB configuration.
- `server/app.mjs`: fixed upstream, path/parameter allowlists, server-only auth, bounded TTL cache, sanitized errors, request rate limit, CORS, CSP, static delivery.
- `src/domain.ts`: pure discovery filters, metadata requirements, recommendation ranking/explanations, list encoding.
- `src/storage.ts`: validated guest library in localStorage, best-effort response cache in IndexedDB (150 records, seven-day fallback).
- `scripts/sw-template.js` → generated `dist/sw.js`: offline web shell and same-origin static assets only. Never caches authenticated requests or API responses in the service worker.
- `android/`: generated native project. Native access is limited to the included Capacitor plugins.

See `docs/ARCHITECTURE.md` for data flows, cache/recommendation semantics, and security boundaries.

## 7. Features

- Real TMDB trending day/week, popular, now-playing, upcoming and top-rated endpoints; editorial hero uses a returned backdrop only.
- Genre collections and configurable hidden-gem discovery, metadata-derived mood filters, and deterministic personalized recommendations from saved/favorite/highly rated movie seeds or Discover.
- Debounced, cancellable movie/TV/person/multi-search; recent searches; genre/year/original-language/rating filters; TMDB-supported discovery sorts; explicit load-more pagination.
- Movie/TV detail pages with available metadata, region-specific certification, cast/crew, reviews, backdrops, official YouTube videos, similar/recommended titles, IMDb/TMDB/official website links.
- Provider availability from TMDB/JustWatch. The actual TMDB response supplies an offers link, **not provider deep links**. The UI labels the destination honestly.
- Watchlist, favorites, watched history, private ratings/notes, custom collections, recently viewed/continue exploring, export/import, shared public title-ID lists (up to 50; never notes/ratings).
- Roulette samples real TMDB discovery pages (not uniform across the entire catalog), watchlist picker with equal per-title chance, side-by-side movie metadata, 90-day primary release-date calendar, and library statistics.
- Light/dark/system themes, responsive layouts, keyboard focus, modal focus management via native dialogs, reduced motion, retry/error/empty/loading states.
- Offline access to the guest library and recently cached metadata after an initial online load. Images are subject to browser cache availability; offline artwork and playback are not promised.

## 8. Important limitations / release gates

- **Live credential validation pending** until you configure and run `check:live`. Live catalog data, real trailers, provider results and all supported endpoint combinations need credentialed acceptance checks.
- **APK/AAB generation and Android-device tests are not completed** in the supplied environment without SDK 36/JDK 21. Generated Android/sync success is not an Android compilation result.
- No accounts, cloud synchronization, push/local reminders, or full-movie playback. Guest data does not automatically move between browsers/devices. These are intentionally omitted, not nonfunctional controls.
- TMDB text search does not support Discover-style filters or sort. Text-search filters apply to **loaded results** while TMDB relevance order is preserved. Load more to scan further. The UI explains this; it does not pretend to run a global filtered search. Suggestions come from actual results and recent searches; there is no implemented spell-correction engine.
- Recommendations use genres, saved/favorite/high-rated seeds, language, release preferences, watched and dismissed exclusions. There is no trained AI, cast/crew/keyword similarity model, or cloud profiling.
- The release calendar uses primary release dates, not a guaranteed region-specific theatrical schedule. TV details and filmographies are supplementary; personal recommendation seeds currently use movies.
- Cache is device-local best-effort storage, not a complete offline mirror. Browser eviction or clearing app data can erase guest data. Export backups. Notes are not application-level encrypted; rely on device/browser security and do not store sensitive secrets.
- Shared lists expose public title IDs and the chosen list title in the URL; only share lists you intend to disclose. Public sharing requires deploying the web app; a localhost link cannot be used by other people.
- No deployment, commercial-license approval, penetration test, real-device performance certification, or full accessibility audit is claimed. See `docs/QA.md`.

## 9. Rename the app

Change `VITE_APP_NAME` in `.env`, the title/manifest in `index.html` and `public/manifest.webmanifest`, `appName` in `capacitor.config.json`, Android string resources (`app_name`, `title_activity_main`), and artwork. `APP_NAME` is centralized in `src/domain.ts` for client display. Set a unique Android package ID before publishing: update `appId`, Gradle `namespace`/`applicationId`, Java package/directory, manifest authorities as needed, and custom deep-link scheme. Do not change package IDs after publishing unless intentionally creating a new app.

## 10. Attribution and licensing

**This product uses the TMDB API but is not endorsed or certified by TMDB.**

The approved unmodified TMDB logo is included in Settings → About and links to https://www.themoviedb.org. Its source is recorded in `THIRD_PARTY_NOTICES.md`. JustWatch receives visible attribution in each availability section. TMDB access grants no right to redistribute movie files or movie artwork outside the agreed API terms. Commercial use requires an appropriate agreement with TMDB. Follow the source providers' terms and YouTube embed policies.

Official references: https://developer.themoviedb.org/docs/faq · https://www.themoviedb.org/about/logos-attribution · https://developer.themoviedb.org/reference/movie-watch-providers
