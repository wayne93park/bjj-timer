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
    case 'TICK': {
      if (!state.isRunning || state.endsAt == null) return state
      const { now } = action
      const { roundSeconds, restSeconds, rounds } = state.config

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
      let { phase, currentRound, endsAt, transitionCount } = state
      let guard = 0
      while (endsAt <= now && guard < 500) {
        guard += 1
        transitionCount += 1
        if (phase === 'round') {
          if (currentRound >= rounds) {
            return {
              ...state,
              phase: 'finished',
              secondsLeft: 0,
              endsAt: null,
              isRunning: false,
              transitionCount,
            }
          }
          if (restSeconds > 0) {
            phase = 'rest'
            endsAt += restSeconds * 1000
          } else {
            currentRound += 1
            endsAt += roundSeconds * 1000
          }
        } else if (phase === 'rest') {
          phase = 'round'
          currentRound += 1
          endsAt += roundSeconds * 1000
        } else {
          return state
        }
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
