import { useEffect, useReducer, useRef, useState } from 'react'
import Controls from './Controls'
import { playCountdownBeep, playTimeUpSound, playHeadsUpSound, preloadSounds } from '../utils/sound'
import { loadConfig, saveConfig } from '../utils/settings'
import {
  DEFAULT_CONFIG,
  HEADS_UP_AT,
  createInitialState,
  formatClock,
  reducer,
  totalRemainingSeconds,
} from '../utils/timerReducer'
import { useWakeLock } from '../hooks/useWakeLock'

const TICK_MS = 250

export default function Timer() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(loadConfig(DEFAULT_CONFIG)),
  )
  const prevTransitionCount = useRef(state.transitionCount)
  const prevSeconds = useRef(state.secondsLeft)
  const [flashNonce, setFlashNonce] = useState(0)

  const { phase, secondsLeft, isRunning, config } = state
  const inSession = phase === 'round' || phase === 'rest'
  const isUrgent = isRunning && inSession && secondsLeft > 0 && secondsLeft <= HEADS_UP_AT
  const showControls = phase === 'idle' || phase === 'finished'

  useWakeLock(isRunning && config.keepScreenOn)

  useEffect(() => {
    preloadSounds()
  }, [])

  useEffect(() => {
    saveConfig(config)
  }, [config])

  useEffect(() => {
    if (!isRunning) return
    const tick = () => dispatch({ type: 'TICK', now: Date.now() })
    const id = setInterval(tick, TICK_MS)
    // Catch up immediately on return rather than waiting for the next tick.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isRunning])

  useEffect(() => {
    if (prevTransitionCount.current === state.transitionCount) return
    prevTransitionCount.current = state.transitionCount
    playTimeUpSound(config.sound)
    setFlashNonce((n) => n + 1)
  }, [state.transitionCount, config.sound])

  useEffect(() => {
    const prev = prevSeconds.current
    prevSeconds.current = secondsLeft
    if (!isRunning || !inSession) return
    // Only react to the clock counting down; a jump upward means a new phase.
    if (secondsLeft >= prev) return
    if (config.headsUpEnabled && prev > HEADS_UP_AT && secondsLeft <= HEADS_UP_AT) {
      playHeadsUpSound()
      setFlashNonce((n) => n + 1)
    }
    if (secondsLeft > 0 && secondsLeft <= 3) playCountdownBeep()
  }, [secondsLeft, isRunning, inSession, config.headsUpEnabled])

  const phaseLabel = { idle: 'Ready', round: 'ROLL', rest: 'REST', finished: 'Done' }[phase]
  const roundLabel =
    phase === 'rest'
      ? `Next: Round ${Math.min(state.currentRound + 1, config.rounds)} / ${config.rounds}`
      : `Round ${Math.min(state.currentRound, config.rounds)} / ${config.rounds}`
  const totalLabel = phase === 'idle' ? 'Total Time' : 'Time Remaining'

  const timerClass = ['timer', `phase-${phase}`, isRunning && 'is-running', isUrgent && 'is-urgent']
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <main className="main">
        <div className={timerClass}>
          {flashNonce > 0 && <div key={flashNonce} className="flash-overlay" />}
          {/* The phase is the useful announcement; a per-second live region on
              the digits would make screen readers talk nonstop. */}
          <div className="timer-phase" aria-live="polite">
            {phaseLabel}
          </div>
          <div className="timer-display">{formatClock(secondsLeft)}</div>
          <div className="timer-round">{roundLabel}</div>
          {phase !== 'finished' && (
            <div className="timer-total">
              {totalLabel}: {formatClock(totalRemainingSeconds(state))}
            </div>
          )}
          <div className="timer-buttons">
            {!isRunning ? (
              <button
                className="btn-primary"
                onClick={() => dispatch({ type: 'START', now: Date.now() })}
              >
                {showControls ? 'Start' : 'Resume'}
              </button>
            ) : (
              <button className="btn-primary" onClick={() => dispatch({ type: 'PAUSE' })}>
                Pause
              </button>
            )}
            {isRunning && (
              <button className="btn-skip" onClick={() => dispatch({ type: 'SKIP', now: Date.now() })}>
                Skip
              </button>
            )}
            <button className="btn-secondary" onClick={() => dispatch({ type: 'RESET' })}>
              Reset
            </button>
          </div>
        </div>
      </main>
      {showControls && (
        <aside className="sidebar sidebar-right">
          <Controls
            config={config}
            onChange={(next) => dispatch({ type: 'SET_CONFIG', config: next })}
          />
        </aside>
      )}
    </>
  )
}
