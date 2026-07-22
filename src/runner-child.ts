import { CHILD_SOURCE, PARENT_SOURCE } from "slideshow-mel/src/protocol";
import type {
  ChildMessageType,
  ChildStepChangedPayload,
  JumpToStepPayload,
  RunnerStep,
} from "slideshow-mel/src/protocol";

/**
 * Vanilla-TS equivalent of slideshow-mel's useShowRunnerChild hook.
 *
 * Implements the steps half of the protocol only — this show declares no
 * actions and no parameters, so SET_PARAMETERS and PERFORM_ACTION are ignored.
 *
 * On init, broadcasts CHILD_READY to the parent window (opener or parent frame)
 * with the full step manifest. PARENT_NEXT advances the step index and
 * PARENT_JUMP_TO_STEP moves to an arbitrary step; both invoke onStep and emit
 * CHILD_STEP_CHANGED. On the final step the first PARENT_NEXT triggers the step
 * action; the second sends CHILD_AT_END so the orchestrator can move on.
 *
 * Safe to call when not inside a frame — the guard at the top exits early.
 */
export function initRunnerChild(
  steps: RunnerStep[],
  onStep: (stepIndex: number) => void
): void {
  const targetWindow = window.opener ?? window.parent;

  // Not embedded in a frame — standalone dev mode, do nothing.
  if (!targetWindow || targetWindow === window) return;

  function send(type: ChildMessageType, payload?: unknown): void {
    targetWindow.postMessage({ source: CHILD_SOURCE, type, payload }, "*");
  }

  let currentStepIndex = 0;
  // Per-step latches, reset by goToStep. On the final step the first
  // PARENT_NEXT plays the content and the second signals the end.
  let finalStepPlayed = false;
  let endSignalled = false;

  function goToStep(stepIndex: number): void {
    currentStepIndex = stepIndex;
    finalStepPlayed = false;
    endSignalled = false;
    onStep(stepIndex);

    const payload: ChildStepChangedPayload = {
      currentStepIndex,
      currentStepId: steps[stepIndex].id,
    };
    send("CHILD_STEP_CHANGED", payload);
  }

  function handleNext(): void {
    if (currentStepIndex < steps.length - 1) {
      goToStep(currentStepIndex + 1);
      return;
    }

    if (!finalStepPlayed) {
      finalStepPlayed = true;
      onStep(currentStepIndex);
    } else if (!endSignalled) {
      endSignalled = true;
      send("CHILD_AT_END", { state: { currentStepIndex, isAtEnd: true } });
    }
  }

  function handleJumpToStep(payload: JumpToStepPayload): void {
    // Resolve by stepId first, fall back to stepIndex.
    const stepIndex =
      payload.stepId !== undefined
        ? steps.findIndex((step) => step.id === payload.stepId)
        : payload.stepIndex ?? -1;

    if (stepIndex < 0 || stepIndex >= steps.length) return;
    goToStep(stepIndex);
  }

  window.addEventListener("message", (event: MessageEvent) => {
    const data = event.data as
      | { source?: string; type?: string; payload?: unknown }
      | null;
    if (data?.source !== PARENT_SOURCE) return;

    if (data.type === "PARENT_NEXT") {
      handleNext();
    } else if (data.type === "PARENT_JUMP_TO_STEP") {
      handleJumpToStep((data.payload ?? {}) as JumpToStepPayload);
    }
  });

  // Announce readiness and advertise the step manifest to the orchestrator.
  send("CHILD_READY", { expectedSteps: steps });
}
