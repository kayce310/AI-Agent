# PLAN_VISIBILITY_CONTEXT_PROOF.md

## 1. Executive Summary
**Objective:** Verify if the `userId` lookup in `sessions.ts:29` allows a Plan from Session A to be injected into the LLM context of Session B.

**Finding:** The `userId` lookup in `sessions.ts` is used exclusively by the `/sessions` command to generate a text-based list of sessions for the user. The resulting data is returned as a `CommandResult` and sent directly to the Telegram chat as a message. There is no evidence that this specific data flow reaches the Agent's state, the LLM's system prompt, or any tool context.

**Final Conclusion:** **DISPROVEN**
`sessions.ts` is not responsible for the Plan that appears in Session B's LLM context.

---

## 2. sessions.ts Lookup Trace
**Trace:**
- **FILE:** `D:/AI-Agent/src/core/commands/builtins/sessions.ts`
- **LINE:** 29
- **SYMBOL:** `sessionsCommand.handler`
- **INPUT:** `ctx` (containing `ctx.userId`)
- **CALL:** `checkpoint.getPlan(ctx.userId)`
- **OUTPUT:** `plan` (The active plan associated with that user ID)
- **CALLER:** `CommandRegistry.execute('sessions', ctx)` $\rightarrow$ `sessionsCommand.handler(ctx)`
- **CALLEE:** `checkpoint.getPlan()`

---

## 3. Plan Data Flow
**Trace of `plan` object after line 29:**
1. **Data Transformation:** The `plan` object is used to construct a string array `lines`.
   - Line 36: `plan.id` $\rightarrow$ formatted string.
   - Line 37: `plan.goal` $\rightarrow$ formatted string.
   - Line 38: `plan.status` and `plan.items` $\rightarrow$ formatted string.
2. **Return Value:** The handler returns `{ text: lines.join('\\n') }` (a `CommandResult`).
3. **Delivery:** The `CommandRegistry` returns this result to the platform adapter (Telegram).
4. **End Point:** `ctx.reply(result.text)` (Sent as a message to the user).

**Analysis:** The `Plan` data is converted to a UI string and sent to the user. It is **not** stored in any persistent state or context that the LLM accesses.

---

## 4. Context/Prompt Injection Trace
**Search for injection points:**
- Checked `sessions.ts`: No calls to state managers or prompt builders.
- Checked `CommandRegistry`: Executes handlers and returns text; does not modify LLM context.
- Checked `src/modules/telegram/commands.ts`: Calls `CoreRegistry.getInstance().execute()`, receives text, and calls `ctx.reply()`.

**Result:** No path exists between `sessionsCommand` output and the LLM prompt.

---

## 5. Session B Trace
**Hypothesis:** Session B $\rightarrow$ `ctx.userId` (U1) $\rightarrow$ `getPlan(U1)` $\rightarrow$ Plan A $\rightarrow$ LLM context.

**Evidence Check:**
- **Session B $\rightarrow$ `ctx.userId`:** FACT.
- **`ctx.userId` $\rightarrow$ `getPlan(U1)`:** FACT (via `/sessions` command).
- **`getPlan(U1)` $\rightarrow$ Plan A:** FACT (if U1 has a plan from another session).
- **Plan A $\rightarrow$ LLM context:** **NOT PROVEN / DISPROVEN**. The trace ends at `ctx.reply()`.

---

## 6. Actual LLM Visibility Proof
- **Is the Plan returned by `/sessions` visible to the user?** YES.
- **Is the Plan returned by `/sessions` visible to the LLM?** NO.
- **Reason:** Command results are delivered to the platform (Telegram) for display, not fed back into the LLM's conversation history or system prompt unless specifically designed as a tool result. `/sessions` is a slash command, not a tool call made by the LLM.

---

## 7. Comparison With update_plan Execution Scope
- **`update_plan` tool path:** `ToolRegistry` $\rightarrow$ `createUpdatePlanPlugin` $\rightarrow$ `checkpointStore.getPlan(sessionId)`.
- **`sessions` command path:** `CommandRegistry` $\rightarrow$ `sessionsCommand` $\rightarrow$ `checkpoint.getPlan(userId)`.

**Distinction:** 
The `update_plan` tool (which causes the failure) uses `sessionId` (correct isolation). The `/sessions` command uses `userId` (broad lookup). While the `/sessions` command has a "visibility leak" (showing a user's active plan regardless of session), this leak is limited to the **User UI**, not the **LLM Context**.

---

## 8. Evidence Classification
| Claim | Status | Evidence |
| :--- | :--- | :--- |
| `sessions.ts` lookup bằng `userId` | **FACT** | `sessions.ts:29` |
| Lookup trả về Plan của A cho B | **FACT** | `checkpoint.getPlan(ctx.userId)` returns the latest plan for that user. |
| Plan được trả về từ command | **FACT** | `return { text: lines.join('\\n') };` |
| Plan được đưa vào Agent context | **NOT PROVEN** | No trace found. |
| Plan được đưa vào LLM prompt | **NOT PROVEN** | No trace found. |
| LLM B thực sự nhìn thấy Plan A | **NOT PROVEN** | No trace found. |

---

## 9. Final Conclusion
**DISPROVEN:**
`sessions.ts` is not responsible for the Plan that appears in Session B's LLM context.
