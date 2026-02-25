---
description: Rules for using the browser subagent effectively without it going off the rails
---

# Browser Agent Usage Guidelines

The browser subagent is powerful but prone to spiraling if not given tight constraints. Follow these rules EVERY TIME you invoke it.

## Project URLs (ALWAYS use these — NEVER guess)

| Environment | Base URL |
|---|---|
| **Production** | `https://prop-firmx.vercel.app` |
| **Staging (develop)** | `https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app` |
| **Gamma API** | `https://gamma-api.polymarket.com` |

When constructing browser tasks, always use the exact URLs above. Never invent domain names like `predictionsfirm.com` or `app.predictionsfirm.com`.

## ⚠️ CRITICAL: Authentication (Google OAuth DOES NOT WORK)

The browser agent **CANNOT** complete Google OAuth login. It will redirect to accounts.google.com, get blocked by bot detection, and spiral. **DO NOT attempt Google OAuth login.**

### How to Authenticate (Credential Login)

The login page at `/login` has TWO methods:
1. "Continue with Google" button (TOP) — **DO NOT USE THIS**
2. Email/Password fields (BOTTOM) — **USE THIS**

The credential fields are:
- An **Email** text input field
- A **Password** text input field  
- A green **"Sign In"** button

**Test account credentials:**
- Email: `forexampletrader@gmail.com`
- Password: `123456rR`

### Login Task Template (Copy-Paste This)

```
STEP 1: Navigate to [BASE_URL]/login
STEP 2: Wait 3 seconds for the page to load.
STEP 3: You will see a login page with "Continue with Google" at the top and email/password fields below. 
        DO NOT click "Continue with Google".
        Instead, find the Email input field below the "OR CONTINUE WITH EMAIL" divider.
STEP 4: Click the Email input field. Clear any existing text first (select all, delete), then type EXACTLY: forexampletrader@gmail.com
        IMPORTANT: Do NOT type the email twice. Type it once, slowly.
STEP 5: Click the Password input field. Type EXACTLY: 123456rR
STEP 6: Click the green "Sign In" button.
STEP 7: Wait 5 seconds for the redirect to complete. You should land on /dashboard.
```

### Known Browser Agent Bugs to Work Around

1. **Double-typing**: The agent sometimes types into a field twice, producing `email@gmail.comemail@gmail.com`. To prevent this, instruct it to "Clear any existing text first (select all, delete), then type".
2. **Clicking Google OAuth**: Even when told not to, the agent sometimes clicks "Continue with Google" because it's the most prominent button. Put the "DO NOT" instruction BEFORE the action step.
3. **localhost doesn't work**: The browser agent runs in a sandbox that cannot reach `localhost` or `127.0.0.1`. Always use the Vercel staging/production URLs.

## Task Description Template

Always structure your browser subagent task description like this:

```
You need to [GOAL]. Follow these steps EXACTLY:

STEP 1: [specific action]
STEP 2: [specific action]
...
STEP N: STOP. Report your findings.

CRITICAL RULES:
- Do NOT navigate to any website other than [allowed domains]
- Do NOT use Google, GitHub, DuckDuckGo, Bing, or any search engine
- Do NOT click on more than [N] things total
- If a page fails to load, report the error and STOP. Do not retry more than once.
- Your entire task should take no more than [N] steps total.
```

## Mandatory Constraints

Every browser subagent call MUST include these in the task description:

1. **Step limit** — "Your entire task should take no more than N steps total" (recommend 10-15 max)
2. **Domain allowlist** — "Do NOT navigate to any website other than [X]"
3. **No search engines** — "Do NOT use Google, GitHub, DuckDuckGo, or any search engine" (unless searching IS the task)
4. **Click budget** — "Do NOT click on more than N things total"
5. **Explicit stop condition** — "STEP N: STOP. Report your findings."
6. **Retry limit** — "If a page fails to load, report the error and STOP. Do not retry more than once."

## Anti-Patterns to Avoid

❌ **Vague goals** — "Check if the site works" → spirals into 50+ steps
✅ **Specific goals** — "Navigate to https://example.com/dashboard, wait 3 seconds, read the page, report if the equity value is visible"

❌ **Open-ended exploration** — "Look up market ID 12345 on Polymarket" → tries every URL format, Google, GitHub, DuckDuckGo...
✅ **Bounded exploration** — "Navigate to https://gamma-api.polymarket.com/markets/12345. Read the JSON. Report the market title and status. If 404, report 'not found' and STOP."

❌ **Multi-site tasks** — "Check Polymarket AND Vercel AND the dashboard" → loses context, interleaves poorly
✅ **Single-site focus** — Make separate browser_subagent calls, one per site

❌ **Google OAuth login** — "Click Continue with Google, enter email on Google's page"
✅ **Credential login** — "Use the email/password fields below 'OR CONTINUE WITH EMAIL'"

## Recommended Step Budgets

| Task Type | Max Steps |
|---|---|
| Read a single page | 5 |
| Fill out a form | 8 |
| Login + navigate to one page | 12 |
| Navigate and screenshot | 5 |
| Multi-page flow (login → dashboard → trade) | 15 |
| Smoke test (check multiple elements) | 15 |

## When NOT to Use the Browser Agent

Use `read_url_content` instead when:
- You just need to fetch JSON from an API
- You need to read static page content
- You don't need to click, scroll, or interact
- The page doesn't require authentication

Use terminal commands instead when:
- You can `curl` an API endpoint
- You need to check a status via CLI (e.g., `vercel` CLI, `git` commands)

## Full Smoke Test Example (Login → Dashboard → Trade)

```
You need to verify the staging deployment. Follow these steps EXACTLY:

STEP 1: Navigate to https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app/login
STEP 2: Wait 3 seconds.
STEP 3: You will see a login page. DO NOT click "Continue with Google".
        Find the Email input field below the "OR CONTINUE WITH EMAIL" divider.
STEP 4: Click the Email input field. Clear any existing text (Ctrl+A, Delete), then type EXACTLY: forexampletrader@gmail.com
STEP 5: Click the Password field. Type EXACTLY: 123456rR
STEP 6: Click the green "Sign In" button.
STEP 7: Wait 5 seconds. Verify you are on /dashboard. Take a screenshot.
STEP 8: Navigate to https://prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app/dashboard/trade
STEP 9: Wait 5 seconds. Click on any event card showing outcomes.
STEP 10: Take a screenshot of the modal. Report what you see.
STEP 11: STOP. Report your findings.

CRITICAL RULES:
- Do NOT click "Continue with Google" — use the email/password fields instead
- Do NOT navigate to any website other than prop-firmx-git-develop-oversightresearch-4292s-projects.vercel.app
- Do NOT use Google or any search engine
- Do NOT click on more than 10 things total
- If a page fails to load, report the error and STOP. Do not retry more than once.
- Your entire task should take no more than 15 steps total.
```
