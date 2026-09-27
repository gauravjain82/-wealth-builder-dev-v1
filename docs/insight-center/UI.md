# Insight Center — UI

| | |
|---|---|
| **Module** | `insight-center` |
| **Source** | `src/features/insight-center/` |
| **Routes** | `/insight-center`, `/public-insight-center` |
| **Backend module** | none |
| **API prefix** | none |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/insight-center` | `ProtectedRoute` | `PublicInsightCenter` |
| `/public-insight-center` | **none** | the same component |

**One component serves both routes.** That is only possible because the module fetches nothing — with no
authenticated request to make, the public and signed-in renderings are identical, so there is no second
implementation to keep in step.

## 2. Components

| Component | Role |
|---|---|
| `PageWrapper` | the shell and layout |
| `VideoIntro` | the intro video |
| `ActionButtons` | the two CTAs — business and education |
| `EasterEggLogo` | the trigger |
| `EasterEggModal` | the hidden video |

Each has its own CSS file beside it.

## 3. States

| State | What the user sees |
|---|---|
| Default | the intro video and two CTAs |
| Easter egg triggered | the hidden-video modal |
| Video unavailable | a broken player — nothing validates the URL |

There are no loading, empty or error states, because there is nothing to load.

## 4. Interaction rules

- **The CTAs navigate to the education routes.** They are the page's purpose.
- **The easter egg must stay discoverable-but-not-accidental.** A logo that opens a modal on a stray click
  would be a bug, not a delight.

## 5. Responsive and print behaviour

Per-component CSS plus Tailwind. This is a marketing page shown on phones, so the video and CTAs are the
parts that matter at narrow widths. No print styles.

## 6. Accessibility

The easter egg is the concern: a hidden interaction on a logo is, by design, not announced. The CTAs and the
video are standard elements.

## 7. Styling and theming

Five component-scoped CSS files. Content — copy, video URLs, CTA labels — is **in the components**, so a
wording change is a release. Unlike [home](../home/), this page is not on
[admin](../admin/)'s content engine, so nobody can edit it without a deploy.
