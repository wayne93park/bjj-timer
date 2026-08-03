// Pure timer state machine, kept free of React and asset imports so it can be
// reasoned about (and tested) on its own.

export const DEFAULT_CONFIG = {
  roundSeconds: 300,
  restSeconds: 60,
  rounds: 6,
  sound: 'bell',
  headsUpEnabled: true,
  keepScreenOn: true,
}

export const HEADS_UP_AT = 10

export function createInitialState(config) {
  return {
    phase: 'idle', // idle | round | rest | finished
    currentRound: 1,
    secondsLeft: config.roundSeconds,
    // Absolute epoch ms when the current phase ends. Null while idle/paused.
    // Deriving the countdown from this (rather than counting ticks) keeps the
    // timer accurate even when the browser throttles or suspends timers in the
    // background -- it self-corrects the moment the app is visible again.
    endsAt: null,
    isRunning: false,
    transitionCount: 0,
    config,
  }
}

function remainingSeconds(endsAt, now) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Total time a session with this config takes, start to finish (no rest
// trails the final round).
export function totalPlannedSeconds(config) {
  const { roundSeconds, restSeconds, rounds } = config
  return roundSeconds * rounds + restSeconds * Math.max(0, rounds - 1)
}

// Time left across the *whole* session, not just the current phase.
export function totalRemainingSeconds(state) {
  const { phase, currentRound, secondsLeft, config } = state
  const { roundSeconds, restSeconds, rounds } = config

  if (phase === 'idle') return totalPlannedSeconds(config)
  if (phase === 'finished') return 0

  const remainingFullRounds = rounds - currentRound
  if (phase === 'round') {
    return secondsLeft + remainingFullRounds * (roundSeconds + restSeconds)
  }
  // phase === 'rest': the round we just finished doesn't count again, and the
  // rest after the final round never happens.
  const remainingFullRests = Math.max(0, remainingFullRounds - 1)
  return secondsLeft + remainingFullRounds * roundSeconds + remainingFullRests * restSeconds
}

// One phase transition, anchored at baseTime. TICK chains these off the
// previous deadline (to replay a schedule accurately across a background
// gap); SKIP anchors off "now" (the new phase starts fresh from the tap).
function stepPhase(phase, currentRound, baseTime, config) {
  const { roundSeconds, restSeconds, rounds } = config
  if (phase === 'round') {
    if (currentRound >= rounds) {
      return { phase: 'finished', currentRound, endsAt: null, finished: true }
    }
    if (restSeconds > 0) {
      return { phase: 'rest', currentRound, endsAt: baseTime + restSeconds * 1000, finished: false }
    }
    return {
      phase: 'round',
      currentRound: currentRound + 1,
      endsAt: baseTime + roundSeconds * 1000,
      finished: false,
    }
  }
  if (phase === 'rest') {
    return {
      phase: 'round',
      currentRound: currentRound + 1,
      endsAt: baseTime + roundSeconds * 1000,
      finished: false,
    }
  }
  return null
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONFIG': {
      // Controls are only reachable while idle/finished, so a config change
      // always means "set up a fresh session".
      const config = action.config
      return {
        ...state,
        config,
        phase: 'idle',
        currentRound: 1,
        secondsLeft: config.roundSeconds,
        endsAt: null,
        isRunning: false,
      }
    }
    case 'START': {
      const { now } = action
      if (state.phase === 'idle' || state.phase === 'finished') {
        return {
          ...state,
          phase: 'round',
          currentRound: 1,
          secondsLeft: state.config.roundSeconds,
          endsAt: now + state.config.roundSeconds * 1000,
          isRunning: true,
          transitionCount: state.transitionCount + 1,
        }
      }
      // Resuming from pause: rebuild the deadline from what was left.
      return { ...state, isRunning: true, endsAt: now + state.secondsLeft * 1000 }
    }
    case 'PAUSE':
      return { ...state, isRunning: false, endsAt: null }
    case 'RESET':
      return {
        ...state,
        phase: 'idle',
        currentRound: 1,
        secondsLeft: state.config.roundSeconds,
        endsAt: null,
        isRunning: false,
      }
    case 'SKIP': {
      if (!state.isRunning) return state
      const { now } = action
      const step = stepPhase(state.phase, state.currentRound, now, state.config)
      if (!step) return state
      const transitionCount = state.transitionCount + 1
      if (step.finished) {
        return {
          ...state,
          phase: 'finished',
          currentRound: step.currentRound,
          secondsLeft: 0,
          endsAt: null,
          isRunning: false,
          transitionCount,
        }
      }
      return {
        ...state,
        phase: step.phase,
        currentRound: step.currentRound,
        endsAt: step.endsAt,
        secondsLeft: remainingSeconds(step.endsAt, now),
        transitionCount,
      }
    }
    case 'TICK': {
      if (!state.isRunning || state.endsAt == null) return state
      const { now } = action

      if (state.endsAt > now) {
        const secondsLeft = remainingSeconds(state.endsAt, now)
        // Returning the same reference lets React skip the re-render, so the
        // sub-second tick rate costs nothing when the display hasn't changed.
        if (secondsLeft === state.secondsLeft) return state
        return { ...state, secondsLeft }
      }

      // Deadline passed. Advance phases in a loop so that returning from a long
      // background gap lands on the correct phase in a single render (and
      // therefore plays one sound, not one per skipped phase).
      let phase = state.phase
      let currentRound = state.currentRound
      let endsAt = state.endsAt
      let transitionCount = state.transitionCount
      let guard = 0
      while (endsAt != null && endsAt <= now && guard < 500) {
        guard += 1
        transitionCount += 1
        const step = stepPhase(phase, currentRound, endsAt, state.config)
        if (!step) break
        if (step.finished) {
          return {
            ...state,
            phase: 'finished',
            currentRound: step.currentRound,
            secondsLeft: 0,
            endsAt: null,
            isRunning: false,
            transitionCount,
          }
        }
        phase = step.phase
        currentRound = step.currentRound
        endsAt = step.endsAt
      }

      return {
        ...state,
        phase,
        currentRound,
        endsAt,
        transitionCount,
        secondsLeft: remainingSeconds(endsAt, now),
      }
    }
    default:
      return state
  }
}
