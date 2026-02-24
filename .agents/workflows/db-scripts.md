---
description: Rules for running any script that connects to the database
---

# Database Script Safety Rules

These rules prevent hung processes that block the IDE terminal and exhaust DB connection pools.

## Hard Rules (NEVER violate)

1. **NEVER use `npx tsx -e "..."` for scripts that connect to the database.**
   - Inline scripts are fragile — shell escaping, template literal parsing, and error handling all break silently.
   - Always write a file in `src/scripts/` and run it with `npx tsx src/scripts/<name>.ts`.

2. **ALWAYS wrap DB scripts with `timeout`:**
   ```bash
   // turbo
   timeout 30 npx tsx src/scripts/<name>.ts
   ```
   The `timeout` command kills the process after 30 seconds regardless of what happens inside.

3. **EVERY DB script MUST include both cleanup paths:**
   ```typescript
   // At the end of main():
   await sql.end();
   process.exit(0);
   
   // In the catch block:
   } catch (e) {
       console.error(e);
       await sql.end();
       process.exit(1);
   }
   ```

4. **Set `WaitMsBeforeAsync` to 500ms** when running DB scripts via `run_command`. This ensures the process goes to background quickly but captures early failures.

5. **Use `connect_timeout: 10`** (not 15+) in postgres.js config to fail fast on connection issues.

## If a Process Hangs

1. Try: `send_command_input` with `Terminate: true`
2. If that fails, run: `pkill -9 -f "<script-name>"` in a new terminal
3. If THAT fails, tell the user to open Activity Monitor and kill the `node` process
4. **Never let a zombie run for more than 2 minutes** — check status and terminate proactively
