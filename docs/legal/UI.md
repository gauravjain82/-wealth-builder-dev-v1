# Legal — UI

| | |
|---|---|
| **Module** | `legal` |
| **Source** | `src/features/legal/` |
| **Routes** | `/privacy-policy`, `/terms-and-conditions` |
| **Backend module** | none |
| **API prefix** | none |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Page |
|---|---|---|
| `/privacy-policy` | **none** | `PrivacyPolicyPage` |
| `/terms-and-conditions` | **none** | `TermsPage` |

Both are **deliberately outside `ProtectedRoute`**, and the router records why:

> *"Public legal pages (must render without login for Google OAuth branding review)"* —
> `src/router/index.tsx:163`

That is a hard external requirement, not a preference. Putting either behind a guard would jeopardise the
Google OAuth verification that [calendar-sync](../calendar-sync/) depends on.

They are linked from the login screen, added in the same 2026-09-04 change
([auth PHASES ~4](../auth/PHASES.md#4--legal-links-2026-09-04)).

`PublicHomePage` also lives here — a marketing page describing Match Up, BPM, events and Google Calendar
sync.

## 2. Screens

| Page | Content |
|---|---|
| `PrivacyPolicyPage` | the privacy policy, in `LegalPageShell` |
| `TermsPage` | the terms, in the same shell |
| `PublicHomePage` | four product highlights |

`LegalPageShell` gives both legal pages one layout, so they cannot diverge in presentation.

## 3. States

*Not applicable.* Nothing loads, so there is no loading, empty or error state. That is precisely what makes
these pages dependable for an external reviewer.

## 4. Interaction rules

- **Never put these routes behind a guard.** The OAuth review requires them to render for an anonymous
  visitor.
- **Keep the login-page links working.** A reviewer follows them from the sign-in screen.

## 5. Responsive and print behaviour

Tailwind utilities. Long-form text, so it reflows naturally.

No explicit print styles, though a terms page is the one thing in this app somebody might genuinely print.

## 6. Accessibility

Long-form prose with real headings, which is the right shape for a policy document. Nothing interactive
beyond links.

## 7. Styling and theming

Tailwind only; no stylesheet. **The legal text is in the components**, so a policy update is a code change
and a deploy — worth knowing, because policy text is exactly the kind of content that changes for legal
reasons rather than product ones, and nobody outside the team can edit it.
