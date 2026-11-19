/**
 * @module for-react/diagrams/runs/GraphRunPresentation
 * @summary Human-readable run presentation messages (DECAF-50 §4.23 G3-34/G3-35).
 * @description Pure message builders for the run-lifecycle affordances that were
 * previously developer-grade or absent: the stuck-run timeout notice (G3-34) and the
 * document round-trip drift message (G3-35). Kept free of framework and HTTP so the
 * demo UI's wording is unit-testable.
 */

/**
 * @description Default stuck-run timeout (ms): a run that produced no terminal event within this window is treated as stuck and is cancelled (G3-34).
 * @summary Default stuck-run timeout (ms): a run that produced no terminal event within this window is treated as stuck and is cancelled (G3-34).
 * @memberOf module:for-react.diagrams
 */
export const GRAPH_RUN_STUCK_TIMEOUT_MS = 60_000;

/**
 * @description Builds the human-readable document round-trip drift message (G3-35). The demo UI never shows raw hashes to the user; the run id is the support reference.
 * @summary Builds the human-readable document round-trip drift message (G3-35).  The demo UI never shows raw hashes to the user; the run id is the support reference.
 * @param runId The run whose stored document drifted.
 * @param submittedHash The semantic hash of the submitted document.
 * @param returnedHash The semantic hash of the stored document.
 * @returns The user-facing drift message.
 * @memberOf module:for-react.diagrams
 */
export function graphRunDriftMessageOf(
  runId: string,
  submittedHash: string,
  returnedHash: string
): string {
  return (
    `This run's stored workflow differs from the one that was submitted, so its ` +
    `results may not match the editor. Reload the page and run again. ` +
    `(Run ${runId}; submitted ${submittedHash.slice(0, 12)}… vs stored ${returnedHash.slice(0, 12)}…)`
  );
}

/**
 * @description Builds the stuck-run timeout message (G3-34): the run exceeded the {@link GRAPH_RUN_STUCK_TIMEOUT_MS} window without a terminal event and is being cancelled.
 * @summary Builds the stuck-run timeout message (G3-34): the run exceeded the {@link GRAPH_RUN_STUCK_TIMEOUT_MS} window without a terminal event and is being cancelled.
 * @param runId The stuck run's id.
 * @param timeoutMs The elapsed timeout window in milliseconds.
 * @returns The user-facing stuck-run message.
 * @memberOf module:for-react.diagrams
 */
export function graphRunStuckMessageOf(runId: string, timeoutMs: number): string {
  return (
    `Run '${runId}' produced no terminal event within ${Math.round(timeoutMs / 1000)}s, ` +
    `so it was cancelled. Start it again.`
  );
}

/**
 * @description Builds the run-failure message (SAA-1361 D8): the run reached a `workflow.failed` terminal, so the UI surfaces the engine's structured error instead of leaving the canvas neutral.
 * @summary Builds the run-failure message (SAA-1361 D8): the run reached a `workflow. failed` terminal, so the UI surfaces the engine's structured error instead of leaving the canvas neutral.
 * @param runId The failed run's id.
 * @param error The terminal envelope's structured error, when the engine sent one.
 * @returns The user-facing run-failure message.
 * @memberOf module:for-react.diagrams
 */
export function graphRunFailureMessageOf(runId: string, error: unknown): string {
  const payload = (error ?? {}) as { message?: unknown; code?: unknown };
  const detail = typeof payload.message === 'string' ? payload.message : '';
  const code = typeof payload.code === 'string' && payload.code ? ` [${payload.code}]` : '';
  return detail
    ? `Run '${runId}' failed${code}: ${detail}`
    : `Run '${runId}' failed before producing a result. Open the run console for details.`;
}

/**
 * @description Builds the run-cancel failure message (G3-34): the cancel request itself failed, so the user knows the run may still be live.
 * @summary Builds the run-cancel failure message (G3-34): the cancel request itself failed, so the user knows the run may still be live.
 * @param runId The run whose cancellation failed.
 * @param error The failure thrown by the cancel request.
 * @returns The user-facing cancel-failure message.
 * @memberOf module:for-react.diagrams
 */
export function graphRunCancelFailureMessageOf(runId: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `Could not cancel run '${runId}': ${detail}`;
}
