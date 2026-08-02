import bellUrl from '../assets/bell_sound.mp3'
import airHornUrl from '../assets/air_horn.mp3'
import clapUrl from '../assets/clap.mp3'

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playTone(frequency, duration, type = 'sine', delay = 0) {
  const ctx = getAudioContext()
  const startTime = ctx.currentTime + delay
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.05)
}

export function playCountdownBeep() {
  playTone(880, 0.15, 'sine')
}

const TIME_UP_SOUNDS = {
  bell: bellUrl,
  air_horn: airHornUrl,
}

export const TIME_UP_SOUND_OPTIONS = [
  { id: 'bell', label: 'Bell' },
  { id: 'air_horn', label: 'Air Horn' },
  { id: 'none', label: 'No Sound' },
]

const TIME_UP_MAX_DURATION_MS = 2800

export function playTimeUpSound(soundId) {
  if (soundId === 'none') return
  const url = TIME_UP_SOUNDS[soundId] || TIME_UP_SOUNDS.bell
  const audio = new Audio(url)
  audio.play().catch(() => {})
  setTimeout(() => {
    audio.pause()
    audio.currentTime = 0
  }, TIME_UP_MAX_DURATION_MS)
}

export function playHeadsUpSound() {
  const audio = new Audio(clapUrl)
  audio.play().catch(() => {})
}
