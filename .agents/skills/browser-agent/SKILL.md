---
name: browser-agent
description: Use this skill whenever you are about to invoke the browser subagent — for smoke tests, UI verification, or any task that requires navigating the Funded Prediction platform in a browser. Read ALL of these rules before constructing any browser subagent task.
---

# Browser Agent Skill

## Project URLs (ALWAYS use these — NEVER guess)

| Environment | Base URL |
|---|---|
| **Production** | `https://prop-firmx.vercel.app` |
| **Staging (develop)** | `https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app` |
| **Gamma API** | `https://gamma-api.polymarket.com` |

Never invent domain names like `predictionsfirm.com` or `app.predictionsfirm.com`.

## ⚠️ CRITICAL: Authentication (Google OAuth DOES NOT WORK)

The browser agent **CANNOT** complete Google OAuth login. It will redirect to accounts.google.com, get blocked by bot detection, and spiral. **DO NOT attempt Google OAuth login — ever.**

### How to Authenticate

The login page at `/login` has TWO methods:
1. "Continue with Google" button (TOP) — **DO NOT USE THIS**
2. Email/Password fields (BOTTOM) — **USE THIS, ALWAYS**

**Test account credentials:**
- Email: `forexampletrader@gmail.com`
- Password: `123456rR`

### Login Steps (Copy-Paste Into Every Task That Requires Login)

```
STEP 1: Navigate to [BASE_URL]/login
STEP 2: Wait 3 seconds for the page to load.
STEP 3: You will see a login page with "Continue with Google" at the top and email/password fields below.
        DO NOT click "Continue with Google".
        Find the Email input field below the "OR CONTINUE WITH EMAIL" divider.
STEP 4: Click the Email input field. Select all text (Ctrl+A) and delete it. Then type EXACTLY: forexampletrader@gmail.com
        IMPORTANT: Type the email ONCE. Do not repeat it.
STEP 5: Click the Password input field. Type EXACTLY: 123456rR
STEP 6: Click the green "Sign In" button.
STEP 7: Wait 5 seconds for the redirect. You should land on /dashboard.
```

### Known Browser Agent Bugs

1. **Double-typing**: Agent types into a field twice → `email@gmail.comemail@gmail.com`. Fix: instruct "Select all (Ctrl+A), delete, then type."
2. **Clicks Google OAuth anyway**: Even when told not to, the agent clicks the top button. Fix: Put the "DO NOT" rule BEFORE the action step.
3. **localhost doesn't work**: Browser agent runs in a sandbox — cannot reach `localhost`. Always use Vercel URLs.

## Task Description Template

Always structure browser subagent tasks like this:

```
You need to [GOAL]. Follow these steps EXACTLY:

STEP 1: [specific action]
STEP 2: [specific action]
...
STEP N: STOP. Report your findings: [exactly what to report].

CRITICAL RULES:
- Do NOT click "Continue with Google" — use the email/password fields below "OR CONTINUE WITH EMAIL"
- Do NOT navigate to any website other than [allowed domains]
- Do NOT use Google, GitHub, DuckDuckGo, Bing, or any search engine
- Do NOT click on more than [N] things total
- If a page fails to load, report the error and STOP. Do not retry more than once.
- Your entire task should take no more than [N] steps total.
```

## Mandatory Constraints (Include in EVERY task)

1. **Step limit** — "Your entire task should take no more than N steps total" (recommend 10–15 max)
2. **Domain allowlist** — "Do NOT navigate to any website other than [X]"
3. **No search engines** — "Do NOT use Google, GitHub, DuckDuckGo, or any search engine"
4. **Click budget** — "Do NOT click on more than N things total"
5. **Explicit stop condition** — "STEP N: STOP. Report your findings."
6. **No Google OAuth** — always explicit, always first rule

## Recommended Step Budgets

| Task Type | Max Steps |
|---|---|
| Read a single page | 5 |
| Fill out a form | 8 |
| Login + navigate to one page | 12 |
| Login + screenshot | 10 |
| Multi-page smoke test (login → dashboard → trade) | 15 |

## When NOT to Use the Browser Agent

Use `read_url_content` instead when:
- You just need to fetch JSON from an API (curl is faster)
- You need to read static page content
- The page doesn't require authentication or interaction

Use terminal commands instead when:
- You can `curl` an API endpoint
- Checking status via CLI (`vercel`, `git`, `npx`)

## Anti-Patterns

| ❌ Wrong | ✅ Right |
|---|---|
| "Check if the site works" | "Navigate to /dashboard, wait 3s, verify equity value is visible, report the number." |
| Multi-site in one task | One `browser_subagent` call per site |
| Google OAuth login | Credential login via email/password fields |
| Vague stop condition | "STEP N: STOP. Report [specific thing]." |
