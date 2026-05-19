# Popup Promotions — Plan 3: React Native Popup Carousel + Landing Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface popup promotions inside the Shweloader mobile app — on Home, Browse, and Subcategory — with client-side trigger logic, frequency capping, a swipable carousel modal, and a promo landing page that lists the linked products.

**Architecture:** TanStack Query fetches eligible popups per screen from the Plan-2 worker endpoint. A Zustand store backed by MMKV tracks per-popup impressions (capped at 2/day) and CTA-clicked state ("never show again"). A `<PopupController>` mounted on each of the three screens evaluates triggers (`screen_entry` with delay, `scroll` with percent), pushes eligible popups into a state array that the modal renders as a swipable horizontal carousel. CTA tap navigates to `/promo/[id]` which fetches the landing endpoint and renders an image banner + a vertical grid of linked listings using the existing `BrowseProductCard` component.

**Tech Stack:** Expo SDK 54 · React Native 0.81 · expo-router 6 · TanStack Query · Zustand 5 · MMKV (sync local storage) · Reanimated 4 · react-native-gesture-handler 2 · expo-image. No test framework — verification is `npx tsc --noEmit` plus manual QA on a dev build.

**Repository:** `/Users/peter/Desktop/shweloader-reactnative-` (separate repo from the admin portal and the workers).

**Source spec:** [docs/superpowers/specs/2026-05-16-popup-promotions-design.md](../specs/2026-05-16-popup-promotions-design.md) (§3, §8, §12)

**Dependencies:** Worker endpoints from Plan 2 are live at `https://app-api.staging.shweloader.com.mm/popup-promotions` (already deployed and smoke-tested).

---

## File structure

**Create:**
- `src/types/popup-promotion.ts` — TypeScript types matching the worker response shapes
- `src/hooks/usePopupPromotions.ts` — TanStack Query hooks (list + landing)
- `src/stores/popupTrackingStore.ts` — Zustand + MMKV: impressions per day, CTA-click sticky flag, eligibility helpers
- `src/components/popup-promotion/PopupModal.tsx` — modal with X close, swipable image carousel, conditional CTA button
- `src/components/popup-promotion/PopupController.tsx` — wires the hook + tracking store + trigger evaluation into a single drop-in component per screen
- `src/screens/PromoLandingScreen.tsx` — image banner + linked-listings grid for `/promo/[id]`
- `app/promo/[id].tsx` — expo-router entry that mounts `PromoLandingScreen`

**Modify:**
- `app/(tabs)/index.tsx` — mount `<PopupController screen="home" scrollOffset={scrollY} />`
- `app/(tabs)/browse.tsx` — mount `<PopupController screen="browse" scrollOffset={scrollY} />` (or pass via a ref to FlashList's scroll)
- `app/(tabs)/category/[type].tsx` — mount `<PopupController screen="subcategory" scrollOffset={scrollY} />`

That's it — three new screens worth of code, three one-line wires, plus the data + store layer. Single user-facing route (`/promo/[id]`).

---

## Task 1: Types + API hook

The foundation. After this task, no UI exists but you can fetch popups in any component.

**Files:**
- Create: `src/types/popup-promotion.ts`
- Create: `src/hooks/usePopupPromotions.ts`

- [ ] **Step 1: Create the types file**

Create `src/types/popup-promotion.ts`:

```ts
export type PopupTargetScreen = 'home' | 'browse' | 'subcategory';
export type PopupTriggerType = 'screen_entry' | 'scroll';

/** Item shape from GET /popup-promotions?screen={...} */
export interface PopupPromotion {
  id: number;
  image_url: string;
  image_thumb_url: string | null;
  cta_label: string | null;
  has_linked_products: boolean;
  trigger_type: PopupTriggerType;
  trigger_delay_seconds: number;
  trigger_scroll_percent: number;
}

/** Item shape inside the `listings` array on GET /popup-promotions/:id/landing */
export interface PopupLandingListing {
  id: number;
  title: string | null;
  thumb_url: string | null;
  brand_name: string | null;
  model_name: string | null;
  custom_id: string | null;
  price_mmk: number | null;
  price_usd: number | null;
  listing_type: 'sale' | 'rent';
}

/** Top-level shape of GET /popup-promotions/:id/landing */
export interface PopupLanding {
  id: number;
  image_url: string;
  listings: PopupLandingListing[];
}
```

- [ ] **Step 2: Create the hook file**

Create `src/hooks/usePopupPromotions.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type {
  PopupPromotion,
  PopupLanding,
  PopupTargetScreen,
} from '../types/popup-promotion';

export const popupPromotionKeys = {
  list: (screen: PopupTargetScreen) =>
    ['popup-promotions', 'list', screen] as const,
  landing: (id: number) =>
    ['popup-promotions', 'landing', id] as const,
};

/** Eligible popups for the given screen. Stateless on the server. */
export function usePopupPromotionsForScreen(screen: PopupTargetScreen) {
  return useQuery({
    queryKey: popupPromotionKeys.list(screen),
    queryFn: async () => {
      const data = await apiClient.get<PopupPromotion[]>(
        `/popup-promotions?screen=${encodeURIComponent(screen)}`,
        { skipAuth: true },
      );
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — admin toggles propagate on next refetch
    gcTime: 30 * 60 * 1000,
  });
}

/** Promo landing data: image banner + linked listings. */
export function usePopupLanding(id: number | null) {
  return useQuery({
    queryKey: popupPromotionKeys.landing(id ?? 0),
    queryFn: async () => {
      return apiClient.get<PopupLanding>(
        `/popup-promotions/${id}/landing`,
        { skipAuth: true },
      );
    },
    enabled: id !== null && id > 0,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // 404 = promo ended; don't retry
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/popup-promotion.ts src/hooks/usePopupPromotions.ts
git commit -m "feat(popup-promotions): types + TanStack Query hooks"
```

---

## Task 2: Local tracking store (MMKV-backed Zustand)

The store enforces the spec's two hard-coded rules:
1. Each popup shows max 2 times per day per user.
2. CTA tap → that popup is never shown to that user again.

State is held in memory by Zustand and mirrored to MMKV (sync, fast) so it survives app restarts.

**Files:**
- Create: `src/stores/popupTrackingStore.ts`

- [ ] **Step 1: Create the store**

Create `src/stores/popupTrackingStore.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkv } from '../services/storage';

/** Per-popup local state. Keyed by popup_promotion_id. */
export interface PopupLocalState {
  /** Map of "YYYY-MM-DD" → number of times shown on that date */
  impressionsByDate: Record<string, number>;
  /** ISO timestamp set when the user taps the CTA. Sticky — never cleared. */
  ctaClickedAt: string | null;
}

interface PopupTrackingStore {
  state: Record<number, PopupLocalState>;
  isEligible: (popupId: number) => boolean;
  markImpression: (popupId: number) => void;
  markCtaClicked: (popupId: number) => void;
}

function todayKey(): string {
  // YYYY-MM-DD in the device's local timezone — matches user perception of "today"
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAILY_CAP = 2;

// MMKV-backed JSON storage adapter for zustand/persist
const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    mmkv.set(name, value);
  },
  removeItem: (name: string) => {
    mmkv.remove(name);
  },
}));

export const usePopupTrackingStore = create<PopupTrackingStore>()(
  persist(
    (set, get) => ({
      state: {},

      isEligible: (popupId: number) => {
        const local = get().state[popupId];
        if (!local) return true; // never shown — eligible
        if (local.ctaClickedAt) return false; // ever clicked — never again
        const today = todayKey();
        const todayCount = local.impressionsByDate?.[today] ?? 0;
        return todayCount < DAILY_CAP;
      },

      markImpression: (popupId: number) => {
        const today = todayKey();
        set((s) => {
          const local = s.state[popupId] ?? {
            impressionsByDate: {},
            ctaClickedAt: null,
          };
          const next: PopupLocalState = {
            ...local,
            impressionsByDate: {
              ...local.impressionsByDate,
              [today]: (local.impressionsByDate[today] ?? 0) + 1,
            },
          };
          return { state: { ...s.state, [popupId]: next } };
        });
      },

      markCtaClicked: (popupId: number) => {
        set((s) => {
          const local = s.state[popupId] ?? {
            impressionsByDate: {},
            ctaClickedAt: null,
          };
          return {
            state: {
              ...s.state,
              [popupId]: { ...local, ctaClickedAt: new Date().toISOString() },
            },
          };
        });
      },
    }),
    {
      name: 'popup_tracking_v1',
      storage: mmkvStorage,
    },
  ),
);
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stores/popupTrackingStore.ts
git commit -m "feat(popup-promotions): MMKV-backed tracking store (2/day + click-sticky)"
```

---

## Task 3: PopupModal — image-only carousel UI

The visual layer. Renders a horizontal carousel of popups (one slide per popup), with a fixed X close button and an optional CTA button overlay per slide.

**Files:**
- Create: `src/components/popup-promotion/PopupModal.tsx`

- [ ] **Step 1: Create the modal**

Create `src/components/popup-promotion/PopupModal.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { ENV } from '../../config/env';
import type { PopupPromotion } from '../../types/popup-promotion';

interface PopupModalProps {
  popups: PopupPromotion[];
  onClose: () => void;
  onCtaTap: (popup: PopupPromotion) => void;
  /** Fires once per popup id when it first becomes visible in the carousel. */
  onImpression: (popupId: number) => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Popup itself is roughly portrait 3:4 capped to 90% of screen width
const POPUP_W = Math.min(SCREEN_W * 0.9, 360);
const POPUP_H = Math.min(SCREEN_H * 0.7, POPUP_W * (4 / 3));

function resolveImageUrl(key: string): string {
  // Worker returns the R2 key (e.g. "popup-promotions/foo.webp"); prefix with the CDN host.
  if (/^https?:\/\//.test(key)) return key;
  return `${ENV.R2_PUBLIC_URL}/${key.replace(/^\//, '')}`;
}

export function PopupModal({
  popups,
  onClose,
  onCtaTap,
  onImpression,
}: PopupModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const seen = useRef<Set<number>>(new Set());
  const listRef = useRef<FlatList<PopupPromotion>>(null);

  // Fire impression the first time each slide becomes visible.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const v of viewableItems) {
        if (v.isViewable && v.item) {
          const item = v.item as PopupPromotion;
          if (!seen.current.has(item.id)) {
            seen.current.add(item.id);
            onImpression(item.id);
          }
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 75,
  }).current;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / POPUP_W);
    if (index !== activeIndex) setActiveIndex(index);
  }, [activeIndex]);

  // When `popups` grows (a late-trigger fires and appends a new slide), we
  // do NOT yank the user's current slide. They can swipe to see the new one.

  if (popups.length === 0) return null;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.popup, { width: POPUP_W, height: POPUP_H }]}>
          <FlatList
            ref={listRef}
            data={popups}
            keyExtractor={(p) => String(p.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => (
              <View style={{ width: POPUP_W, height: POPUP_H }}>
                <Image
                  source={{ uri: resolveImageUrl(item.image_url) }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                {/* CTA button (bottom overlay) — only when popup has linked products */}
                {item.has_linked_products && item.cta_label ? (
                  <View style={styles.ctaContainer} pointerEvents="box-none">
                    <Pressable
                      onPress={() => onCtaTap(item)}
                      style={({ pressed }) => [
                        styles.ctaButton,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.ctaLabel}>{item.cta_label}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          />

          {/* Pagination dots (only when more than one) */}
          {popups.length > 1 ? (
            <View style={styles.dots} pointerEvents="none">
              {popups.map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    styles.dot,
                    i === activeIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          {/* X close — top-right, OUTSIDE the FlatList so swipes don't hit it */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeButton}
            accessibilityLabel="Close popup"
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ctaButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#fbb811',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  dots: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 14,
  },
});
```

**Tap behavior notes (per spec §3):**
- The X close button is rendered OUTSIDE the FlatList so swiping doesn't accidentally trigger it.
- The CTA button is the only interactive overlay on the image — there is no full-image press handler. Tapping the image itself does nothing (per spec resolution: "image tap = no-op").
- When `has_linked_products` is `false` (branding-only popup), the CTA button is not rendered at all. The user can only dismiss via X.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/popup-promotion/PopupModal.tsx
git commit -m "feat(popup-promotions): image-only swipable popup modal"
```

---

## Task 4: PopupController — trigger evaluation + state orchestration

The drop-in component each tab screen mounts. Owns:
- Fetching eligible popups for its `screen`
- Filtering out those that aren't locally eligible (2/day, click-sticky)
- Evaluating triggers (screen_entry with delay, scroll with percent)
- Maintaining `visiblePopups: PopupPromotion[]` — grows as triggers fire, not on screen mount
- Rendering `<PopupModal>` when the list is non-empty
- Calling `markImpression` per slide via the modal's callback
- Calling `markCtaClicked` and navigating to `/promo/[id]` on CTA tap

**Files:**
- Create: `src/components/popup-promotion/PopupController.tsx`

- [ ] **Step 1: Create the controller**

Create `src/components/popup-promotion/PopupController.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { usePopupPromotionsForScreen } from '../../hooks/usePopupPromotions';
import { usePopupTrackingStore } from '../../stores/popupTrackingStore';
import { PopupModal } from './PopupModal';
import type { PopupPromotion, PopupTargetScreen } from '../../types/popup-promotion';

interface PopupControllerProps {
  screen: PopupTargetScreen;
  /**
   * Optional shared scroll position (in pixels). If provided AND the screen
   * has any popups with trigger_type='scroll', the controller will fire those
   * popups when scroll % crosses their threshold.
   *
   * Use Reanimated's useSharedValue + useAnimatedScrollHandler to wire this.
   */
  scrollOffsetY?: SharedValue<number>;
  /**
   * The total scrollable content height in pixels. Required only if scroll
   * triggers should work; can be derived from FlatList's onContentSizeChange
   * or ScrollView's onLayout / onContentSizeChange.
   */
  contentHeight?: SharedValue<number>;
  /** Visible viewport height; same conditions as contentHeight. */
  layoutHeight?: SharedValue<number>;
}

export function PopupController({
  screen,
  scrollOffsetY,
  contentHeight,
  layoutHeight,
}: PopupControllerProps) {
  const router = useRouter();
  const { data: allPopups = [] } = usePopupPromotionsForScreen(screen);
  const { isEligible, markImpression, markCtaClicked } = usePopupTrackingStore();

  // Snapshot of popups that haven't been triggered yet (still waiting).
  const pendingRef = useRef<PopupPromotion[]>([]);
  // Popups currently visible in the carousel. Pushed-to as triggers fire.
  const [visiblePopups, setVisiblePopups] = useState<PopupPromotion[]>([]);
  // Track which screen-entry timers we've set up so cleanup works on unmount.
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  // Track which popup ids have already fired (avoid double-fire from scroll oscillation).
  const firedRef = useRef<Set<number>>(new Set());

  // Filter to locally-eligible popups and split by trigger type.
  useEffect(() => {
    const eligible = allPopups.filter((p) => isEligible(p.id));
    pendingRef.current = eligible;
    firedRef.current = new Set();
    setVisiblePopups([]);

    // Schedule screen_entry triggers
    const entryPopups = eligible.filter((p) => p.trigger_type === 'screen_entry');
    for (const p of entryPopups) {
      const delayMs = Math.max(0, p.trigger_delay_seconds) * 1000;
      const t = setTimeout(() => {
        firePopup(p);
      }, delayMs);
      timersRef.current.add(t);
    }

    return () => {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current.clear();
    };
    // Re-run whenever the popup list changes for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPopups]);

  const firePopup = useCallback((p: PopupPromotion) => {
    if (firedRef.current.has(p.id)) return;
    firedRef.current.add(p.id);
    setVisiblePopups((prev) => [...prev, p]);
  }, []);

  // Scroll trigger — fires when scroll % crosses the popup's threshold.
  // Runs on the UI thread; calls firePopup via runOnJS.
  useAnimatedReaction(
    () => {
      if (!scrollOffsetY || !contentHeight || !layoutHeight) return 0;
      const total = contentHeight.value - layoutHeight.value;
      if (total <= 0) return 0;
      return Math.min(100, Math.max(0, (scrollOffsetY.value / total) * 100));
    },
    (percent) => {
      if (percent <= 0) return;
      // Find any pending scroll-triggered popup whose threshold is now crossed.
      const pending = pendingRef.current;
      for (const p of pending) {
        if (
          p.trigger_type === 'scroll' &&
          !firedRef.current.has(p.id) &&
          percent >= p.trigger_scroll_percent
        ) {
          runOnJS(firePopup)(p);
        }
      }
    },
    [scrollOffsetY, contentHeight, layoutHeight, firePopup],
  );

  const handleClose = useCallback(() => {
    setVisiblePopups([]);
  }, []);

  const handleCtaTap = useCallback(
    (popup: PopupPromotion) => {
      markCtaClicked(popup.id);
      setVisiblePopups([]);
      router.push(`/promo/${popup.id}` as never);
    },
    [markCtaClicked, router],
  );

  const handleImpression = useCallback(
    (popupId: number) => {
      markImpression(popupId);
    },
    [markImpression],
  );

  if (visiblePopups.length === 0) return null;

  return (
    <PopupModal
      popups={visiblePopups}
      onClose={handleClose}
      onCtaTap={handleCtaTap}
      onImpression={handleImpression}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/popup-promotion/PopupController.tsx
git commit -m "feat(popup-promotions): controller wires hooks + triggers + modal"
```

---

## Task 5: Wire into the three tab screens

Three identical drop-ins — one per screen — with the appropriate `screen` prop. Home and Browse have existing scroll handlers; Subcategory may or may not. Reuse what the screen already has.

**Files:**
- Modify: `app/(tabs)/index.tsx` — Home
- Modify: `app/(tabs)/browse.tsx` — Browse
- Modify: `app/(tabs)/category/[type].tsx` — Subcategory

### Step 1: Home (`app/(tabs)/index.tsx`)

The Home screen already uses `useAnimatedScrollHandler` + `useSharedValue` for its own scroll-driven UI (collapsing header). Reuse the same shared value.

Find the existing block that sets up the scroll handler. It looks like:

```tsx
const scrollY = useSharedValue(0);
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => {
    scrollY.value = e.contentOffset.y;
  },
});
```

(Exact variable name may vary — search for `useSharedValue(0)` near the top of the component.)

You need two more shared values for content/layout height. Add them next to `scrollY`:

```tsx
const contentH = useSharedValue(0);
const layoutH = useSharedValue(0);
```

And on the existing `<Animated.ScrollView>` (or whatever scrollable component the screen uses), add:

```tsx
onContentSizeChange={(_w, h) => { contentH.value = h; }}
onLayout={(e) => { layoutH.value = e.nativeEvent.layout.height; }}
```

(These are JS-thread handlers writing to the shared value — fine for size events that fire infrequently.)

Then add the import near the other component imports:

```tsx
import { PopupController } from '../../src/components/popup-promotion/PopupController';
```

And render `<PopupController>` at the bottom of the screen's JSX (outside the scrollable content — it's a modal overlay):

```tsx
<PopupController
  screen="home"
  scrollOffsetY={scrollY}
  contentHeight={contentH}
  layoutHeight={layoutH}
/>
```

- [ ] **Step 1a: Apply the Home wiring**
- [ ] **Step 1b: `npx tsc --noEmit` — must pass**

### Step 2: Browse (`app/(tabs)/browse.tsx`)

Browse uses FlashList. Same idea — add three shared values and attach to FlashList:

```tsx
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { PopupController } from '../../src/components/popup-promotion/PopupController';

// inside the component:
const scrollY = useSharedValue(0);
const contentH = useSharedValue(0);
const layoutH = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => { scrollY.value = e.contentOffset.y; },
});

// on the existing FlashList:
//   onScroll={scrollHandler}  (if not already)
//   scrollEventThrottle={16}
//   onContentSizeChange={(w, h) => { contentH.value = h; }}
//   onLayout={(e) => { layoutH.value = e.nativeEvent.layout.height; }}
```

⚠️ **Important:** FlashList wraps a native scroll view. Reanimated's scroll handler integration with FlashList is supported but the syntax differs by version. If the current screen does NOT already use Reanimated scroll-driven animations, the simplest alternative is to use Browse's onScroll prop with a regular `useState` and pass plain numbers down — but that re-renders the screen on every scroll frame. **Recommended:** convert the FlashList scroll handler to `useAnimatedScrollHandler` if not already; the perf is much better.

If Browse already has a scroll handler, just wire the same way as Home. If not, scroll-triggered popups will simply not fire on Browse — entry-triggered ones still do — which is acceptable for a v1.

Place the controller below the FlashList:

```tsx
<PopupController
  screen="browse"
  scrollOffsetY={scrollY}
  contentHeight={contentH}
  layoutHeight={layoutH}
/>
```

- [ ] **Step 2a: Apply the Browse wiring**
- [ ] **Step 2b: `npx tsc --noEmit` — must pass**

### Step 3: Subcategory (`app/(tabs)/category/[type].tsx`)

Same pattern. If the subcategory screen doesn't already have a Reanimated scroll handler, you can:
- **Option A**: Add one (preferred — supports scroll-triggered popups).
- **Option B**: Mount `<PopupController screen="subcategory" />` without any scroll props. Only entry-triggered popups will fire on this screen.

Pick A unless the file is already very large. Then:

```tsx
<PopupController
  screen="subcategory"
  scrollOffsetY={scrollY}
  contentHeight={contentH}
  layoutHeight={layoutH}
/>
```

- [ ] **Step 3a: Apply the Subcategory wiring**
- [ ] **Step 3b: `npx tsc --noEmit` — must pass**

### Step 4: Commit all three screen edits

```bash
git add app/\(tabs\)/index.tsx app/\(tabs\)/browse.tsx app/\(tabs\)/category/\[type\].tsx
git commit -m "feat(popup-promotions): mount PopupController on Home/Browse/Subcategory"
```

---

## Task 6: Promo landing route + screen

The destination of a CTA tap. Minimal per spec §3: image banner at the top, vertical grid of linked listings, no marketing copy.

**Files:**
- Create: `src/screens/PromoLandingScreen.tsx`
- Create: `app/promo/[id].tsx`

- [ ] **Step 1: Create the screen component**

Create `src/screens/PromoLandingScreen.tsx`:

```tsx
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ENV } from '../config/env';
import { usePopupLanding } from '../hooks/usePopupPromotions';
import { useTheme } from '../theme/ThemeContext';
import type { PopupLandingListing } from '../types/popup-promotion';

interface Props {
  promoId: number;
}

function resolveImageUrl(key: string | null): string | null {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  return `${ENV.R2_PUBLIC_URL}/${key.replace(/^\//, '')}`;
}

function priceText(item: PopupLandingListing): string {
  if (item.price_mmk != null) return `${item.price_mmk.toLocaleString()} MMK`;
  if (item.price_usd != null) return `$${item.price_usd.toLocaleString()}`;
  return 'Price on request';
}

export function PromoLandingScreen({ promoId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    usePopupLanding(promoId);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PopupLandingListing>) => {
      const thumb = resolveImageUrl(item.thumb_url);
      return (
        <Pressable
          onPress={() => router.push(`/product/${item.id}` as never)}
          style={[styles.row, { backgroundColor: theme.card }]}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.muted }]} />
          )}
          <View style={styles.rowBody}>
            {item.brand_name ? (
              <Text style={[styles.brand, { color: theme.mutedForeground }]}>
                {item.brand_name.toUpperCase()}
              </Text>
            ) : null}
            <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
              {item.title ?? 'Listing'}
            </Text>
            {item.custom_id ? (
              <Text style={[styles.customId, { color: theme.mutedForeground }]}>
                {item.custom_id}
              </Text>
            ) : null}
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: theme.foreground }]}>
                {priceText(item)}
              </Text>
              <View
                style={[
                  styles.badge,
                  item.listing_type === 'rent' ? styles.badgeRent : styles.badgeSale,
                ]}
              >
                <Text style={styles.badgeText}>
                  {item.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [router, theme],
  );

  // Banner image as list header
  const ListHeader = data ? (
    <View>
      <Image
        source={{ uri: resolveImageUrl(data.image_url)! }}
        style={styles.banner}
        contentFit="cover"
        transition={250}
      />
    </View>
  ) : null;

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 404 = promo ended; show empty state with a Back button
  if (isError) {
    const status = (error as any)?.status;
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backFab}>
          <ArrowLeft size={22} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
          {status === 404 ? 'This promotion has ended' : 'Failed to load promotion'}
        </Text>
        <Pressable onPress={() => refetch()}>
          <Text style={[styles.retry, { color: theme.primary }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={styles.backFab}>
        <ArrowLeft size={22} color="#fff" />
      </Pressable>
      <FlashList
        data={data?.listings ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  banner: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#000' },
  backFab: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  rowBody: { flex: 1, justifyContent: 'center', gap: 2 },
  brand: { fontSize: 10, letterSpacing: 0.5, fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '600' },
  customId: { fontSize: 11 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  price: { fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeSale: { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
  badgeRent: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  retry: { fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 2: Create the route**

Create `app/promo/[id].tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';
import { PromoLandingScreen } from '../../src/screens/PromoLandingScreen';

export default function PromoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const promoId = Number(id);
  if (!Number.isInteger(promoId) || promoId <= 0) {
    return null; // expo-router will show the screen briefly; alternatively redirect home
  }
  return <PromoLandingScreen promoId={promoId} />;
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/PromoLandingScreen.tsx app/promo/\[id\].tsx
git commit -m "feat(popup-promotions): promo landing route + screen"
```

---

## Task 7: Manual QA on a dev build

There's no test framework in this repo. End-to-end QA is the only way to know it works. **Expo Go won't work for this build because MMKV is a native module — you need an Expo dev client build.** If you don't have one running, see `BUILD_GUIDE.md` in the repo root.

**Pre-conditions:**
- Admin has created at least 2 active popup promotions targeting `home` with different triggers (one `screen_entry` delay=3s, one `scroll` percent=50) and at least one with linked products.
- Mobile worker is serving them (confirmed via `curl https://app-api.staging.shweloader.com.mm/popup-promotions?screen=home`).

- [ ] **Step 1: Start the dev build**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
pnpm start
# Open on a connected device or simulator that already has the dev client installed
```

- [ ] **Step 2: Walk the happy path**

1. Open the app → land on Home → wait 3 seconds → first popup appears.
2. Confirm the X close button works (popup disappears, no navigation).
3. Reopen Home (navigate to another tab and back) — popup should appear AGAIN (until 2/day cap).
4. Reopen one more time — popup appears (3rd time).
5. Reopen a 4th time — popup does NOT appear (cap reached). Wait until tomorrow or clear AsyncStorage to retest.
6. Open Home fresh, wait 3s, popup appears, tap CTA — should navigate to `/promo/[id]` with banner + listing grid visible.
7. Reopen Home — that popup does NOT appear again (CTA-clicked is sticky).

- [ ] **Step 3: Walk the scroll trigger**

1. Create a second popup with `trigger_type=scroll, trigger_scroll_percent=50` for the `home` screen.
2. Open Home, don't scroll — only the screen_entry popup fires.
3. Scroll past the halfway point of the page — the scroll popup is appended to the carousel.
4. Confirm: you can swipe left/right between the two slides, X dismisses the whole modal, each slide records its own impression independently.

- [ ] **Step 4: Walk the no-CTA case**

1. Create a popup with 0 linked products (admin form allows this — leave the linked-products section empty).
2. Activate it for `browse`.
3. Open Browse → popup appears with just the image and X — no CTA button.
4. Tap anywhere on the image (outside X): nothing happens (per spec).
5. Tap X: dismisses.

- [ ] **Step 5: Walk the landing page error states**

1. Create a popup with linked products → tap CTA → see the landing page.
2. In the admin, deactivate that popup while the landing page is open.
3. Pull-to-refresh the landing page → "This promotion has ended" empty state, Back button visible.

- [ ] **Step 6: AsyncStorage / MMKV persistence**

1. Trigger a popup, dismiss it. Force-close the app.
2. Reopen the app, navigate to Home — the popup appears again (until cap reached) confirming impression counts persisted.
3. Trigger a popup, tap CTA → land on promo page. Force-close the app.
4. Reopen the app, navigate to Home — the popup does NOT appear (CTA-clicked persisted).

- [ ] **Step 7: Report findings + commit if anything needed adjusting**

If any step fails, fix and re-run that step. Make the fix in the smallest commit that makes sense — don't fold UX tweaks into the original architecture commits.

---

## Self-review checklist for the implementer

Run this once after Tasks 1–6 land:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No `Modal` or popup component appears on screens OTHER than home / browse / subcategory (search for `PopupController` — it should only be in those three files)
- [ ] CTA navigation works (`/promo/[id]` route resolves; banner + listings render)
- [ ] X close vs CTA tap vs image tap behave per spec (Task 7 Step 4)
- [ ] MMKV state survives app force-close (Task 7 Step 6)
- [ ] No console warnings about "non-serializable values" in the navigation params (we only pass `id`, a number)
- [ ] Network failure on `/popup-promotions?screen=home` does NOT crash the screen — the screen still renders, just no popup (TanStack Query swallows the error in the `data = []` default; verify by toggling airplane mode briefly)

If any item fails, stop and resolve before declaring Plan 3 complete.

---

## What's NOT in this plan (intentionally deferred)

- **Product Details screen as a popup target** — spec §2 explicitly excludes this; just Home / Browse / Subcategory.
- **Exit-intent / back-button triggers** — spec §2 excludes.
- **Server-side analytics on impressions/clicks** — tracking is local-only per spec §12.
- **Cooldown between popups across screens** — spec §12 explicitly says "No cooldown between screens."
- **Localization of the CTA label** — the admin types whatever label they want; the app renders it verbatim. If multi-language popups become a need, add a `cta_label_my` column on the admin side first.
- **Pull-to-refresh on the carousel modal itself** — TanStack Query's window-focus refetch handles it on tab change; no need.
- **A11y on the carousel** — currently the X has `accessibilityLabel`. The image + dots could be enriched in a follow-up.

These do not block the user-facing payoff. Once Plan 3 lands and a popup appears on the user's phone during the demo, the feature is done.
