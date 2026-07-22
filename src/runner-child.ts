import type { RunnerStep } from 'slideshow-mel'

// Mirror the protocol constants from slideshow-mel/src/protocol.ts.
// Defined inline here so the runtime bundle stays React-free.
const PARENT_SOURCE = 'SHOW_RUNNER_PARENT'
const CHILD_SOURCE = 'SHOW_RUNNER_CHILD'

/**
 * Vanilla-TS equivalent of slideshow-mel's useShowRunnerChild hook.
 *
 * On init, broadcasts CHILD_READY to the parent window (opener or parent frame)
 * with the full step manifest. Each PARENT_NEXT message advances the step index
 * and invokes onStep(newIndex). On the final step the first PARENT_NEXT triggers
 * the step action; the second sends CHILD_AT_END so the orchestrator can move on.
 *
 * Safe to call when not inside a frame — the guard at the top exits early.
 */
export function initRunnerChild(
  steps: RunnerStep[],
  onStep: (stepIndex: number) => void,
): void {
  const targetWindow = window.opener ?? window.parent

  // Not embedded in a frame — standalone dev mode, do nothing.
  if (!targetWindow || targetWindow === window) return

  function send(type: string, payload?: unknown): void {
    targetWindow.postMessage({ source: CHILD_SOURCE, type, payload }, '*')
  }

  // Announce readiness and advertise the step manifest to the orchestrator.
  send('CHILD_READY', { expectedSteps: steps })

  let currentStepIndex = 0
  let finalStepActivated = false

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { source?: string; type?: string } | null
    if (data?.source !== PARENT_SOURCE) return

    if (data.type === 'PARENT_NEXT') {
      const isFinal = currentStepIndex >= steps.length - 1

      if (!isFinal) {
        // Advance and trigger the next step's action.
        currentStepIndex++
        onStep(currentStepIndex)
      } else if (!finalStepActivated) {
        // First press on the final step: trigger its action.
        finalStepActivated = true
        onStep(currentStepIndex)
      } else {
        // Second press on the final step: signal we are done.
        send('CHILD_AT_END')
      }
    }
  })
}
