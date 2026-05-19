# React Native App — Performance Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the Shweloader React Native app from "functional and fast enough" to "premium-feeling" — faster cold start, smoother scrolling, lower bridge churn, no deprecated SDK calls, no warning noise. Aim for noticeable improvement on real low-mid range Android devices.

**Architecture:** Eleven targeted patches, each independent and individually shippable. No new architecture — just leverages capabilities already in your stack (React Compiler in Expo SDK 54, `Image.prefetch`, modular Firebase API, Reanimated worklets) and tightens existing patterns. Most tasks are ≤50 lines; the Firebase migration is the largest.

**Tech Stack:** Expo SDK 54, React Native 0.81 (Fabric/New Arch), React 19.1, expo-router 6, expo-image, Reanimated 4, TanStack Query 5 + MMKV persister, Pusher, Firebase Messaging.

**Repository:** `/Users/peter/Desktop/shweloader-reactnative-`

**Already in place — do NOT re-do:**
- `newArchEnabled: true`, Hermes (default), `enableScreens(true)`
- `freezeOnBlur: true` on tabs layout + `enableFreeze(true)` at root
- React.memo on BrowseProductCard
- Reanimated for animations, GestureHandler for gestures
- TanStack Query + MMKV persister with `buster: 'v1'`
- `expo-image` with `transition` props
- `scrollEventThrottle={16}` on scroll views
- `babel-plugin-transform-remove-console` strips console.* in prod

**Out of scope (deferred to a follow-up):**
- iOS-specific optimizations (Hermes inline cache tuning, ProMotion 120Hz)
- Native module audit for unused imports
- Sentry/Crashlytics integration polish
- E2E perf benchmarks via Maestro

---

## Task 1: Enable React Compiler

The Babel React Compiler eliminates 90% of manual `useMemo` / `useCallback` / `React.memo` and produces tighter renders than humans write. Foundation for all later perf wins — turn this on first so the other tasks land on top of it.

**Files:**
- Modify: `app.config.ts`
- Modify: `babel.config.js`

- [ ] **Step 1: Verify the compiler is available**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
grep -E "babel-plugin-react-compiler|react-compiler" package.json
```

Expected: `babel-plugin-react-compiler` is already a transitive dep of `babel-preset-expo` in SDK 54. If `grep` returns nothing in `package.json` directly, that's still fine — `babel-preset-expo` brings it.

- [ ] **Step 2: Enable in `app.config.ts`**

Open `app.config.ts`. After the `newArchEnabled: true` line, add an `experiments` block:

```ts
  newArchEnabled: true,
  experiments: {
    reactCompiler: true,
  },
```

- [ ] **Step 3: Run a smoke typecheck**

```bash
npx tsc --noEmit
```

Expected: existing baseline error count (~68 lines) unchanged.

- [ ] **Step 4: Rebuild required**

Note in your test plan that React Compiler kicks in at build time. A Metro hot-reload alone won't enable it — you need a fresh native build (`eas build` or `pnpm android`). Plan to rebuild after Tasks 1–6 are batched.

- [ ] **Step 5: Commit**

```bash
git add app.config.ts
git commit -m "perf(rn): enable React Compiler (auto-memoization)"
```

---

## Task 2: Audit list-card image sizes

Verify every list-card surface uses the `thumbnail_sm_url` (~80px webp) and never a full-resolution image. A single full-size image on a 50-row list = 30–50MB of network + decode work that should have been 1MB.

**Files:**
- Modify: any card component currently using a non-thumbnail field

- [ ] **Step 1: Find every place a list card sets imageUri**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
grep -rnE "imageUri\s*=|source=\{?\{\s*uri" src/components --include="*.tsx" | grep -vE "test|stories"
```

Expected output: a handful of card components. Likely candidates:
- `src/components/browse/BrowseProductCard.tsx`
- `src/components/home/ProductCard.tsx`
- `src/components/home/FeaturedListings.tsx`
- `src/components/notifications/*.tsx`
- Anything that renders a product/blog row

- [ ] **Step 2: For each card found, verify it consumes a thumbnail field**

Inspect each caller to see what they pass as `imageUri`. The `Product` type has both `thumbnailUrl` (full) and `thumbnailSmUrl` (small). Cards should use the small one first:

```tsx
imageUri={item.thumbnailSmUrl || item.thumbnailUrl || item.images[0]?.url}
```

If any caller is passing `item.thumbnailUrl` directly (without the `Sm` fallback first), patch it. Example fix on Home's `FeaturedListings.tsx`:

Find lines that pass image to `<ProductCard imageUri={...}>` and update to prefer `thumbnailSmUrl`.

- [ ] **Step 3: Confirm `expo-image` cache policy is `disk`**

Open `src/components/browse/BrowseProductCard.tsx` and any other `<Image>` users. Add `cachePolicy="disk"` to `<Image>` instances that don't have it:

```tsx
<Image
  source={{ uri: imageUri }}
  style={styles.image}
  contentFit="cover"
  cachePolicy="disk"  // ← add this if missing
  recyclingKey={id}
  transition={200}
/>
```

Disk cache is the default in newer expo-image, but explicit is clearer and avoids regression.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "perf(rn): prefer thumbnail_sm_url on list cards; explicit disk cache"
```

---

## Task 3: Decouple non-critical fetches from the splash gate

Currently `SplashGate` in `app/_layout.tsx` waits for `equipmentCategories` and `attachmentCategories` to be `isFetched: true` before hiding the splash screen. On a cold start with no persisted cache (first install, or after `gcTime` expiry), this can hold the splash for 2+ seconds while two D1 calls round-trip.

The fix: hide the splash as soon as the React tree is mounted; show category skeletons in-place if the data isn't ready yet.

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `src/components/home/CategoriesSection.tsx` (verify it already handles a "loading" state — if not, add a skeleton)

- [ ] **Step 1: Inspect current `CategoriesSection` for a loading state**

```bash
grep -nE "isLoading|isFetched|skeleton|isPlaceholder" src/components/home/CategoriesSection.tsx | head -10
```

If the component already handles a loading state (you'll see `isLoading` / a skeleton), great. If not, the easiest patch is to render a row of placeholder boxes when data is empty. (For this plan we'll assume the component handles empty arrays gracefully — if not, add a Task 3b inline.)

- [ ] **Step 2: Rewrite `SplashGate` in `app/_layout.tsx`**

Find the `SplashGate` function (around line 67) and replace the body. The new gate only waits for `isReady` from `useFeatureFlags()` — categories load in the background while the user is already inside the app.

Current code (around lines 67–100):

```tsx
function SplashGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useFeatureFlags();
  const { isFetched: equipCatFetched } = useEquipmentCategories();
  const { isFetched: attachCatFetched } = useAttachmentCategories();
  useFeaturedListings();
  useAnnouncements();
  useCarousel();
  useBlogs();
  useLocations();

  const allDataReady = isReady && equipCatFetched && attachCatFetched;
  useEffect(() => {
    if (allDataReady) SplashScreen.hideAsync();
  }, [allDataReady]);
  // ... splash UI ...
}
```

Replace with:

```tsx
function SplashGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useFeatureFlags();

  // Kick off non-critical fetches in the background. The screens render
  // skeletons until each query resolves; the splash does NOT block on them.
  useEquipmentCategories();
  useAttachmentCategories();
  useFeaturedListings();
  useAnnouncements();
  useCarousel();
  useBlogs();
  useLocations();

  // Hide splash as soon as feature flags resolve — typically <100ms after
  // the bundle finishes loading.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={splashStyles.container}>
        <StatusBar style="dark" />
        <Image
          source={require('../assets/images/splash-logo.png')}
          style={splashStyles.logo}
        />
        <ActivityIndicator size="small" color="#fbb811" style={splashStyles.spinner} />
      </View>
    );
  }

  return <>{children}</>;
}
```

Key changes:
- Drop `isFetched` checks from the gate condition
- The query hooks still fire (warming caches) but their loading states are owned by each consuming screen

- [ ] **Step 3: Sanity-check `CategoriesSection` renders gracefully on empty data**

Open `src/components/home/CategoriesSection.tsx`. Confirm: when its data hook returns an empty array (because the query is still in-flight), the component either:
- Shows a skeleton row
- Shows nothing (and Home gracefully scrolls without it)
- Doesn't crash with "Cannot read length of undefined" etc.

If it crashes, add an `isLoading` guard or a default `[]` to the data hook destructure.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "perf(rn): unblock splash from non-critical category fetches"
```

---

## Task 4: Image preloading on navigation tap-down

When a user taps a product card, prefetch the detail-page hero image during the tap-down event so it's decoded by the time the navigator finishes the transition (200–300ms later). Removes the "image pops in after the page slides in" feel.

**Files:**
- Modify: `src/components/browse/BrowseProductCard.tsx` (start here — most-used card)
- Modify: `src/components/home/ProductCard.tsx` (if it has its own implementation)

- [ ] **Step 1: Find the tap-down hook in `BrowseProductCard`**

```bash
grep -nE "onPress|handlePress|AnimatedPressable" src/components/browse/BrowseProductCard.tsx | head -5
```

The card uses `AnimatedPressable` with an `onPress` handler. We want to prefetch in `onPressIn` (fires earlier than onPress).

- [ ] **Step 2: Add prefetch on tap-down**

In `BrowseProductCard.tsx`, near the top, ensure `Image` is imported from `expo-image`:

```tsx
import { Image } from 'expo-image';
```

Find the existing onPress handler (likely something like):

```tsx
const handlePress = useCallback(() => {
  router.push(`/product/${id}` as never);
}, [id, router]);
```

Add a companion `handlePressIn` that prefetches the detail-page image. The detail page typically loads a higher-res image (`thumbnailUrl` not `thumbnailSmUrl`), so prefetch that:

```tsx
const handlePressIn = useCallback(() => {
  // Fire-and-forget; if it fails the detail screen still loads from network.
  Image.prefetch(imageUri).catch(() => {});
}, [imageUri]);
```

Then wire it onto the `AnimatedPressable`:

```tsx
<AnimatedPressable
  onPress={handlePress}
  onPressIn={handlePressIn}
  scale={0.97}
  ...
>
```

Note: `imageUri` here is the small thumbnail; if the detail page loads a different (full-res) URL, prefetch THAT one instead. Inspect the detail page's image source to confirm — if it loads `item.thumbnailUrl` or `item.images[0].url`, prefetch that URL instead.

- [ ] **Step 3: Repeat for any other navigation-triggering cards**

```bash
grep -lE "router.push.*product/\$\{" src/components --include="*.tsx"
```

Apply the same onPressIn pattern to each.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "perf(rn): prefetch detail-page image on card tap-down"
```

---

## Task 5: Clean up Reanimated render-phase shared-value writes

The dev Metro log shows recurring `[Reanimated] Writing to value during component render` warnings. They come from the `onLayout` / `onContentSizeChange` callbacks I added in Plan 3's popup-promotions wiring, which write to `SharedValue<number>` synchronously during React's commit phase. The warning is dev-only, but the pattern is fragile and worth cleaning up.

**Files:**
- Modify: `app/(tabs)/index.tsx` (Home)
- Modify: `app/(tabs)/browse.tsx` (Browse)
- Modify: `app/(tabs)/category/[type]/[category].tsx` (Subcategory)

- [ ] **Step 1: Move the shared-value writes off the render phase**

In each of the three files, find the `onLayout` and `onContentSizeChange` callbacks that write to `contentH.value` and `layoutH.value`. Defer the write to the next microtask:

Before:

```tsx
onLayout={(e) => {
  const h = e.nativeEvent.layout.height;
  setScrollViewHeight(h);     // only on Home
  layoutH.value = h;
}}
onContentSizeChange={(_w, h) => {
  contentH.value = h;
}}
```

After:

```tsx
onLayout={(e) => {
  const h = e.nativeEvent.layout.height;
  setScrollViewHeight(h);     // only on Home — keep React state for consumers
  // Defer to next tick so the write happens outside the commit phase.
  requestAnimationFrame(() => { layoutH.value = h; });
}}
onContentSizeChange={(_w, h) => {
  requestAnimationFrame(() => { contentH.value = h; });
}}
```

`requestAnimationFrame` schedules the write for the next frame, which is after React has finished committing. Reanimated's strict mode is happy, and the trigger evaluation is still responsive (worst case: one extra frame's delay, which is ~16ms).

- [ ] **Step 2: Typecheck**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
npx tsc --noEmit
```

Expected: baseline error count unchanged.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx app/\(tabs\)/browse.tsx app/\(tabs\)/category/\[type\]/\[category\].tsx
git commit -m "perf(rn): defer popup-promotions layout-size writes off commit phase"
```

---

## Task 6: Migrate Firebase Messaging to modular SDK

The Metro log is full of deprecation warnings:

```
WARN  This method is deprecated (as well as all React Native Firebase namespaced API)
      and will be removed in the next major release...
```

These come from `src/hooks/useNotifications.ts` using the namespaced API (`messaging().onMessage(...)`). The modular API (`getMessaging()`, `onMessage(messaging, ...)`) is recommended and slightly faster (no proxy traps).

**Files:**
- Modify: `src/hooks/useNotifications.ts`
- Possibly: `src/services/notificationService.ts`

- [ ] **Step 1: List every namespaced call**

```bash
grep -nE "messaging\(\)|firebase\.app\(\)|firebase\.database\(\)" \
  src/hooks/useNotifications.ts \
  src/services/notificationService.ts
```

- [ ] **Step 2: Migrate `useNotifications.ts`**

Replace `require('@react-native-firebase/messaging').default` + `messaging()` calls with the modular API:

Before (typical pattern):

```ts
const messaging = require('@react-native-firebase/messaging').default;
const unsubscribeTokenRefresh = messaging().onTokenRefresh(() => { ... });
const unsubscribeForeground = messaging().onMessage((msg) => { ... });
const unsubscribeBackground = messaging().onNotificationOpenedApp((msg) => { ... });
const initial = await messaging().getInitialNotification();
const granted = await messaging().requestPermission();
const token = await messaging().getToken();
```

After:

```ts
import {
  getMessaging,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  getToken,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

const messaging = getMessaging();
const unsubscribeTokenRefresh = onTokenRefresh(messaging, () => { ... });
const unsubscribeForeground = onMessage(messaging, (msg) => { ... });
const unsubscribeBackground = onNotificationOpenedApp(messaging, (msg) => { ... });
const initial = await getInitialNotification(messaging);
const granted = await requestPermission(messaging);
const token = await getToken(messaging);
```

Apply the same modular import to `setBackgroundMessageHandler` if `useNotifications.ts` registers one.

- [ ] **Step 3: Check `notificationService.ts`**

```bash
grep -nE "messaging\(\)|ServerValue|firebase\.database" src/services/notificationService.ts
```

Replace any namespaced calls with the modular equivalents:
- `messaging()` → `getMessaging()`
- `firebase.database().ref(...)` → `import { getDatabase, ref } from '@react-native-firebase/database'; ref(getDatabase(), ...)`
- `firebase.database.ServerValue.TIMESTAMP` → `import { ServerValue } from '@react-native-firebase/database'; ServerValue.TIMESTAMP`

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: same baseline. If new errors appear from the import changes, fix them — the modular API signatures are stable and well-typed.

- [ ] **Step 5: Verify Metro log is clean of "deprecated" warnings**

After the migration, restart the dev server and confirm the Metro log no longer shows the deprecation flood. The Firebase namespaced warnings are the bulk of the Metro noise.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useNotifications.ts src/services/notificationService.ts
git commit -m "refactor(notifications): migrate Firebase Messaging to modular SDK"
```

---

## Task 7: Pusher subscription audit

The app subscribes to public and user Pusher channels via `src/services/pusherService.ts`. Verify subscriptions are torn down when the screen loses focus (not just when it unmounts) — otherwise idle tabs continue to receive realtime events and re-render.

**Files:**
- Modify: depends on findings — likely `src/services/pusherService.ts` or wherever subscriptions are wired

- [ ] **Step 1: Find subscription call sites**

```bash
grep -rnE "subscribeToPublic|subscribeToUser|pusherService\." src --include="*.tsx" --include="*.ts" | head -10
```

The root `app/_layout.tsx` subscribes once globally — that's fine, the subscription should outlive any single screen.

If you find subscribe calls inside specific screens (e.g. `app/(tabs)/chat-history.tsx` or `app/chat-history.tsx`), check whether their `useEffect` returns an unsubscribe cleanup.

- [ ] **Step 2: For each per-screen subscription, verify cleanup**

A correct subscription effect:

```tsx
useEffect(() => {
  const unsub = pusherService.subscribe(channelName, handler);
  return () => unsub();
}, [channelName]);
```

If you find a subscription without a cleanup return, add one.

- [ ] **Step 3: For long-running subscriptions, consider `focusManager`**

If a chat screen subscribes only while focused, wrap the subscription in a `useIsFocused()` check:

```tsx
import { useIsFocused } from '@react-navigation/native';

const isFocused = useIsFocused();
useEffect(() => {
  if (!isFocused) return;
  const unsub = pusherService.subscribe(channelName, handler);
  return () => unsub();
}, [isFocused, channelName]);
```

But only do this if the subscription is per-screen — global subscriptions in `_layout.tsx` should stay always-on.

- [ ] **Step 4: Typecheck + commit (only if changes were made)**

```bash
npx tsc --noEmit
git add -A
# If nothing changed, skip the commit
git diff --cached --quiet || git commit -m "perf(rn): scope Pusher subscriptions to focused screens"
```

If the audit finds no leaks, that's fine — note it in the task report and move on with no commit.

---

## Task 8: Provider lazy-mount audit

The root layout in `app/_layout.tsx` mounts a stack of providers: `GestureHandlerRootView` → `RootSiblingParent` → `KeyboardProvider` → `PersistQueryClientProvider` → `AppSettingsProvider` → `SplashGate` → `ThemeProvider` → `LanguageProvider`. Each provider adds a tiny mount-time cost. Verify none of them block first-paint with expensive setup.

**Files:**
- Inspect (no changes unless something jumps out): `app/_layout.tsx`, `src/providers/AppSettingsProvider.tsx`, `src/theme/ThemeContext.tsx`, `src/i18n/LanguageContext.tsx`

- [ ] **Step 1: For each provider, time its mount work**

Add a temporary `console.time` / `console.timeEnd` around each provider's body to measure how long their initial render takes. Example for `AppSettingsProvider`:

```tsx
console.time('[perf] AppSettingsProvider mount');
// ... existing body ...
console.timeEnd('[perf] AppSettingsProvider mount');
```

Run the app and check the Metro logs. Any provider that takes > 50ms on mount is a candidate for optimization (defer work to a `useEffect`, lazy-load data, etc.).

- [ ] **Step 2: Remove the timing logs after measurement**

After you've identified slow providers, revert the timing code (it's noise in production).

- [ ] **Step 3: For any slow provider found, defer non-blocking work**

If `AppSettingsProvider` does a synchronous expensive parse on mount, move it to a `useEffect` so the first paint isn't blocked. Same for theme/language if they load translations at mount.

This step is investigative — if everything is already fast, do nothing.

- [ ] **Step 4: Commit (only if changes were made)**

```bash
npx tsc --noEmit
git diff --quiet || git commit -m "perf(rn): defer provider mount-time work"
```

---

## Task 9: expo-image disk cache lifecycle

Explicit eviction of stale expo-image disk cache entries prevents the cache from ballooning indefinitely on long-running installs. Not a critical issue — expo-image already auto-evicts — but worth setting an explicit cap for low-storage devices.

**Files:**
- Modify: `app/_layout.tsx` (one-time setup in app root)

- [ ] **Step 1: Add the cache size cap**

Open `app/_layout.tsx`. Near the top of the module (after the imports, before the `RootLayout` function), add:

```ts
import { Image as ExpoImage } from 'expo-image';

// Cap the disk cache so it doesn't balloon on long-running installs.
// 100 MB is plenty for a marketplace app's product thumbnails.
ExpoImage.setMemoryCacheSize?.(50 * 1024 * 1024);  // 50 MB RAM
// expo-image disk eviction is automatic; this is here as documentation
// of the policy. If we ever need a manual purge: ExpoImage.clearDiskCache().
```

Note: `setMemoryCacheSize` may not exist in the current expo-image version. Use optional chaining so it's a no-op if the API isn't there. Check the version:

```bash
grep '"expo-image"' package.json
```

If `setMemoryCacheSize` isn't available, skip this task (recent expo-image versions handle caching well by default).

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add app/_layout.tsx
git commit -m "perf(rn): explicit expo-image memory cache cap"
```

If the API isn't available, skip the commit.

---

## Task 10: Haptics polish

Audit places where a Pressable should give haptic feedback but doesn't. The existing app uses `haptic.selection()`, `haptic.light()`, `haptic.medium()`, `haptic.success()` widely — extend that to the few surfaces that still don't.

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (tab tap haptic)
- Inspect: any prominent Pressable without haptic

- [ ] **Step 1: Add haptic on tab tap**

Open `app/(tabs)/_layout.tsx`. Find the Tabs component or its individual Tab.Screen registrations. Add a `tabPress` listener that fires `haptic.light()`:

```tsx
import { haptic } from '../../src/animations';

// On each <Tabs.Screen>, add:
<Tabs.Screen
  name="..."
  options={{...}}
  listeners={{
    tabPress: () => {
      haptic.light();
    },
  }}
/>
```

If the layout uses a custom tab bar component, add the haptic in the tab's onPress handler instead.

- [ ] **Step 2: Inspect other large Pressables**

```bash
grep -rnE "<Pressable" src/components --include="*.tsx" | wc -l
```

Pick the 3–5 most-used (cards, primary action buttons, save heart) and verify each has a haptic. If any prominent CTA is missing it, add `haptic.light()` to its onPress.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat(haptics): light haptic on tab tap; fill in missing CTAs"
```

---

## Task 11: Animation duration sweep

Many screens use 300ms transitions; 200ms feels significantly snappier without sacrificing readability. Audit all `withTiming({ duration: 300 })` and similar to see if shortening is safe.

**Files:**
- Inspect/modify: any file using `withTiming`, `withSpring`, or `Animated.timing` with `duration: 300`+

- [ ] **Step 1: Find all 300ms+ durations**

```bash
grep -rnE "duration:\s*([3-9][0-9]{2}|1[0-9]{3})" src app --include="*.tsx" --include="*.ts"
```

This finds every `duration: 300` through `duration: 1999`. Skim the results:
- **300ms timings on screen-entry / fade-ins**: drop to 200ms. Snappier.
- **300ms timings on bottom-sheet open**: drop to 220–250ms (slightly longer than fade for spatial feel).
- **300ms+ on shake / error animations**: leave alone (those should feel deliberate).
- **`withSpring`**: typically don't have explicit duration — leave alone.

- [ ] **Step 2: Update conservatively**

For each candidate, change `duration: 300` → `duration: 200` (or `220` for slide animations).

DO NOT change:
- Splash/onboarding timings (intentionally paced)
- Any animation labeled as a "callout" or "tutorial" (where the user is meant to notice it)

- [ ] **Step 3: Test on device**

After the changes, scroll/tap around the app on the device. Any animation that now feels too abrupt — revert. Trust your eye more than the spec.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "perf(rn): snappier animation durations (300ms → 200ms where safe)"
```

---

## Final verification (after all 11 tasks land)

- [ ] `npx tsc --noEmit` returns the baseline error count (~68) — no regressions from this plan
- [ ] Metro log has fewer warnings than before (Firebase deprecations gone, Reanimated render-phase warnings gone)
- [ ] Cold start feels noticeably faster (splash hides in <500ms, not 2s+)
- [ ] Tab switches feel instant (no perceptible delay)
- [ ] Product card → detail navigation feels seamless (no late image pop-in)
- [ ] Scrolling Browse/Subcategory grids at full speed on a mid-range Android stays at 60fps in the Perf overlay
- [ ] No new crashes during 5 minutes of free exploration

If any item fails, dig into that one specifically — the plan's tasks are independent so problems are easy to isolate.

---

## What's NOT in this plan

- **iOS Hermes inline-cache tuning** — Hermes is on, that's enough for now
- **Sentry/Firebase Crashlytics integration** — separate concern
- **Maestro E2E perf tests** — out of scope; the verification step is manual
- **Bundle analyzer + tree shaking** — possible follow-up if the .aab is too large
- **Native module audit** (find/remove unused) — defer until we see bundle size pain
- **The 3 already-applied perf wins** from the menu (`scrollEventThrottle`, `enableScreens`, `React.memo on BrowseProductCard`)

These are real but lower-impact than the 11 tasks above. Pick them up later if the app still feels off after this plan ships.
