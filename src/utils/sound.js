import bellUrl from '../assets/bell_sound.mp3'
import airHornUrl from '../assets/air_horn.mp3'
import clapUrl from '../assets/clap.mp3'

let audioCtx = null
const bufferCache = new Map()

function getAudioContext() {
  if (!audioCtx) {
    // iOS routes Web Audio through the ringer channel by default, so the
    // hardware silent switch mutes the app entirely. Declaring a playback
    // session opts out of that where the API is supported.
    try {
      if ('audioSession' in navigator) navigator.audioSession.type = 'playback'
    } catch {
      // not supported -- sound still works unless the phone is on silent
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function loadBuffer(url) {
  if (bufferCache.has(url)) return bufferCache.get(url)
  const ctx = getAudioContext()
  const promise = fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .catch(() => null)
  bufferCache.set(url, promise)
  return promise
}

// Mobile browsers (notably iOS Safari) require every <audio> playback to be
// tied to a direct user gesture, so it silently blocks sounds fired from a
// timer tick. Playing through Web Audio buffer sources on a single shared
// AudioContext avoids that: once the context is unlocked by the first tap
// (Start button), it stays unlocked for all later scheduled playback.
function playBuffer(url, maxDuration) {
  const ctx = getAudioContext()
  loadBuffer(url).then((buffer) => {
    if (!buffer) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    if (maxDuration) {
      source.start(0, 0, Math.min(maxDuration, buffer.duration))
    } else {
      source.start(0)
    }
  })
}

export function preloadSounds() {
  loadBuffer(bellUrl)
  loadBuffer(airHornUrl)
  loadBuffer(clapUrl)
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

const TIME_UP_MAX_DURATION_SEC = 2.8

export function playTimeUpSound(soundId) {
  if (soundId === 'none') return
  const url = TIME_UP_SOUNDS[soundId] || TIME_UP_SOUNDS.bell
  playBuffer(url, TIME_UP_MAX_DURATION_SEC)
}

export function playHeadsUpSound() {
  playBuffer(clapUrl)
}
