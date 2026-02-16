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

## Recommended Step Budgets

| Task Type | Max Steps |
|---|---|
| Read a single page | 5 |
| Fill out a form | 8 |
| Check deployment logs (Vercel) | 10 |
| Navigate and screenshot | 5 |
| Multi-page flow (login → dashboard) | 15 |
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

## Example: Good vs Bad

### BAD — Leads to 170+ step spiral
```
Check two Polymarket markets to determine if they are resolved.
Navigate to https://polymarket.com/event?id=439437288738
```
(Browser can't find the page → tries Google → tries GitHub → tries DuckDuckGo → tries Bing → 170 steps later, still no answer)

### GOOD — Completes in 10 steps
```
You need to verify that a Vercel deployment succeeded. Follow these steps EXACTLY:

STEP 1: Open https://vercel.com/my-project/deployments
STEP 2: Wait 5 seconds.
STEP 3: Read the page. Report the most recent deployment status.
STEP 4: Navigate to https://vercel.com/my-project/logs
STEP 5: Wait 5 seconds.
STEP 6: Read the page. Report any "error" log entries.
STEP 7: STOP. Report your findings.

CRITICAL RULES:
- Do NOT navigate to any website other than vercel.com
- Do NOT use Google or any search engine
- Do NOT click on more than 3 things total
- If a page fails to load, report the error and STOP. Do not retry more than once.
- Your entire task should take no more than 10 steps total.
```
