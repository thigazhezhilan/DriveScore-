---
name: android-app-twa
description: How the DriveScore Android app was built (TWA via PWABuilder), how updates work, and what to do for Play Store
metadata:
  type: project
---

# DriveScore Android app — full record (built 2026-06-15)

The Android app is a **TWA (Trusted Web Activity)** = a thin native shell that just opens the live site `https://drive-score.vercel.app` full-screen. It contains **no website code**. Built with **PWABuilder** (pwabuilder.com), not a local toolchain. See [[drivescore-state]].

## Key identity / facts (do not change)
- **Package ID: `com.drivescore.app`** — PERMANENT. Changing it = a brand-new Play Store listing from zero (lose reviews/installs). Never change.
- App name: **DriveScore** · Short name: **D_S** · Host: `drive-score.vercel.app` · Start URL `/` · theme `#06140f`
- Signing SHA-256: `0B:5F:10:3E:F8:50:AB:30:04:67:8C:98:CC:AE:85:3E:E9:8F:37:21:0C:2D:46:F5:8B:11:41:AC:2A:A4:77:E3`

## ⚠️ Signing keystore (CRITICAL — back up forever)
PWABuilder generated `signing.keystore` + `signing-key-info.txt` (keystore + key passwords inside). They came in the downloaded folder `D_S - Google Play package (3)/`.
- **If lost, the app can NEVER be updated on Play Store again.** Must be stored in safe, backed-up storage (password manager / Drive / USB), OUTSIDE the repo.
- gitignored via `.gitignore` rules: `*.keystore`, `*.jks`, `signing-key-info.txt`, `*Google Play package*/` — so they never get committed to the public GitHub repo.

## How it was wired up (the one piece of repo code needed)
1. PWABuilder produced: `DriveScore.aab` (upload to Play Store), `DriveScore.apk` (sideload/test), `assetlinks.json`, keystore.
2. Added **`public/.well-known/assetlinks.json`** with the package name + SHA-256 above → proves app/site ownership so the URL bar is hidden (Digital Asset Links).
3. **Auth middleware was 307-redirecting `/.well-known/`** → fixed by adding `\.well-known/` to the negative-lookahead matcher in `middleware.ts`. Must stay excluded or asset-link verification breaks.
4. Pushed to `main`; verified live: `curl https://drive-score.vercel.app/.well-known/assetlinks.json` → HTTP 200. (Commits 052e76f assetlinks+gitignore, 7135fbe middleware fix.)

## How updates behave (the important answer)
**The app auto-updates exactly like the website — do nothing.** Normal flow `change code → push to GitHub → Vercel auto-build → live` makes the app show the latest on next open, because the app just loads the live URL. The installed APK never needs rebuilding for content/feature/UI/bug changes.

**Rebuild + re-upload APK/AAB ONLY for native shell changes:** app name, icon, package ID, splash colors, Android target-SDK bump (Google mandates ~yearly), or new native permissions (camera/push).

Caching note: `public/sw.js` service worker may show the old version for one launch then refresh next open (normal PWA). To force-update immediately, bump `CACHE_VERSION` in `public/sw.js`.

## Testing locally (confirmed working 2026-06-15)
Sideloaded `DriveScore.apk` on an Android phone (transfer → tap → allow unknown source → install) — works, loads live site full-screen. Faster alt: Chrome on phone → site → "Add to Home screen" installs the same PWA. iPhone: APK won't work; use Safari "Add to Home Screen".

## Play Store — NOT done yet; remaining manual steps (user only)
1. Google Play Developer account — https://play.google.com/console — one-time **$25** + identity verification (hours–days).
2. Create app → upload **`DriveScore.aab`** (NOT the apk). Store title can be "DS". Need description, phone screenshots, Education category.
3. **Privacy policy URL required** (collects student data) — not yet created; would host at `/privacy`.
4. Content rating + data-safety form → submit → Google review (~days to ~1 week for first app).
Realistic time to live: **3–7 days**. assetlinks already live so store verification passes automatically.

## Rebuild recipe (if ever needed)
pwabuilder.com → enter `https://drive-score.vercel.app` → Package for stores → Android → Google Play → reuse Package ID `com.drivescore.app` and the SAME signing key ("Use mine" → upload the saved keystore) so updates are accepted.
