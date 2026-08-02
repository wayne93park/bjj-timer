import { useEffect, useReducer, useRef, useState } from 'react'
import Controls from './Controls'
import { playCountdownBeep, playTimeUpSound, playHeadsUpSound, preloadSounds } from '../utils/sound'
import { loadConfig, saveConfig } from '../utils/settings'
import { useWakeLock } from '../hooks/useWakeLock'

const DEFAULT_CONFIG = {
  roundSeconds: 300,
  restSeconds: 60,
  rounds: 6,
  sound: 'bell',
  headsUpEnabled: true,
  keepScreenOn: true,
}

function createInitialState() {
  const config = loadConfig(DEFAULT_CONFIG)
  return {
    phase: 'idle', // idle | round | rest | finished
    currentRound: 1,
    secondsLeft: config.roundSeconds,
    isRunning: false,
    transitionCount: 0,
    config,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONFIG': {
      const config = action.config
      if (state.phase !== 'idle') return { ...state, config }
      return { ...state, config, secondsLeft: config.roundSeconds }
    }
    case 'START': {
      if (state.phase === 'idle' || state.phase === 'finished') {
        return {
          ...state,
          phase: 'round',
          currentRound: 1,
          secondsLeft: state.config.roundSeconds,
          isRunning: true,
          transitionCount: state.transitionCount + 1,
        }
      }
      return { ...state, isRunning: true }
    }
    case 'PAUSE':
      return { ...state, isRunning: false }
    case 'RESET':
      return {
        ...state,
        phase: 'idle',
        currentRound: 1,
        isRunning: false,
        secondsLeft: state.config.roundSeconds,
      }
    case 'TICK': {
      if (!state.isRunning) return state
      const secondsLeft = state.secondsLeft - 1
      if (secondsLeft > 0) return { ...state, secondsLeft }

      if (state.phase === 'round') {
        if (state.currentRound >= state.config.rounds) {
          return {
            ...state,
            phase: 'finished',
            isRunning: false,
            secondsLeft: 0,
            transitionCount: state.transitionCount + 1,
          }
        }
        if (state.config.restSeconds > 0) {
          return {
            ...state,
            phase: 'rest',
            secondsLeft: state.config.restSeconds,
            transitionCount: state.transitionCount + 1,
          }
        }
        return {
          ...state,
          currentRound: state.currentRound + 1,
          secondsLeft: state.config.roundSeconds,
          transitionCount: state.transitionCount + 1,
        }
      }
      if (state.phase === 'rest') {
        return {
          ...state,
          phase: 'round',
          currentRound: state.currentRound + 1,
          secondsLeft: state.config.roundSeconds,
          transitionCount: state.transitionCount + 1,
        }
      }
      return state
    }
    default:
      return state
  }
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Timer() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const prevTransitionCount = useRef(state.transitionCount)
  const [flashNonce, setFlashNonce] = useState(0)

  useWakeLock(state.isRunning && state.config.keepScreenOn)

  useEffect(() => {
    preloadSounds()
  }, [])

  useEffect(() => {
    saveConfig(state.config)
  }, [state.config])

  useEffect(() => {
    if (!state.isRunning) return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.isRunning])

  useEffect(() => {
    if (prevTransitionCount.current !== state.transitionCount) {
      playTimeUpSound(state.config.sound)
      setFlashNonce((n) => n + 1)
      prevTransitionCount.current = state.transitionCount
    }
  }, [state.transitionCount, state.config.sound])

  useEffect(() => {
    if (!state.isRunning) return
    if (state.phase !== 'round' && state.phase !== 'rest') return
    if (state.config.headsUpEnabled && state.secondsLeft === 10) {
      playHeadsUpSound()
      setFlashNonce((n) => n + 1)
    }
    if (state.secondsLeft > 0 && state.secondsLeft <= 3) {
      playCountdownBeep()
    }
  }, [state.secondsLeft, state.isRunning, state.phase, state.config.headsUpEnabled])

  const phaseLabel = {
    idle: 'Ready',
    round: 'ROLL',
    rest: 'REST',
    finished: 'Done',
  }[state.phase]

  const displayRound = Math.min(state.currentRound, state.config.rounds)

  return (
    <>
      <main className="main">
        <div className={`timer phase-${state.phase} ${state.isRunning ? 'is-running' : ''}`}>
          {flashNonce > 0 && <div key={flashNonce} className="flash-overlay" />}
          <div className="timer-phase">{phaseLabel}</div>
          <div className="timer-display">{formatClock(Math.max(state.secondsLeft, 0))}</div>
          <div className="timer-round">
            Round {displayRound} / {state.config.rounds}
          </div>
          <div className="timer-buttons">
            {!state.isRunning ? (
              <button onClick={() => dispatch({ type: 'START' })}>
                {state.phase === 'idle' || state.phase === 'finished' ? 'Start' : 'Resume'}
              </button>
            ) : (
              <button onClick={() => dispatch({ type: 'PAUSE' })}>Pause</button>
            )}
            <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
          </div>
        </div>
      </main>
      {!state.isRunning && (
        <aside className="sidebar sidebar-right">
          <Controls
            config={state.config}
            disabled={state.phase !== 'idle'}
            onChange={(config) => dispatch({ type: 'SET_CONFIG', config })}
          />
        </aside>
      )}
    </>
  )
}
