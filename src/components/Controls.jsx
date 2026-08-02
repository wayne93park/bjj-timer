import { useEffect, useState } from 'react'
import { TIME_UP_SOUND_OPTIONS, playTimeUpSound, playHeadsUpSound } from '../utils/sound'

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function Stepper({ label, value, step, stepLabel, min, format, onChange }) {
  const display = format ? format(value) : value
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-control">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          − {stepLabel}
        </button>
        <span className="stepper-value">{display}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
        >
          + {stepLabel}
        </button>
      </div>
    </div>
  )
}

function SettingsModal({ config, update, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button type="button" className="modal-close" aria-label="Close settings" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="setting-row">
          <label className="setting-label" htmlFor="sound-select">
            Time&apos;s Up Sound
          </label>
          <div className="setting-control">
            <select
              id="sound-select"
              value={config.sound}
              onChange={(e) => update('sound', e.target.value)}
            >
              {TIME_UP_SOUND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="preview-button"
              disabled={config.sound === 'none'}
              onClick={() => playTimeUpSound(config.sound)}
            >
              ▶
            </button>
          </div>
        </div>

        <div className="setting-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.headsUpEnabled}
              onChange={(e) => update('headsUpEnabled', e.target.checked)}
            />
            10s Heads-Up Sound
          </label>
          <button
            type="button"
            className="preview-button"
            disabled={!config.headsUpEnabled}
            onClick={() => playHeadsUpSound()}
          >
            ▶
          </button>
        </div>

        <div className="setting-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.keepScreenOn}
              onChange={(e) => update('keepScreenOn', e.target.checked)}
            />
            Keep Screen On While Running
          </label>
        </div>
      </div>
    </div>
  )
}

export default function Controls({ config, onChange }) {
  const [showSettings, setShowSettings] = useState(false)

  function update(field, value) {
    onChange({ ...config, [field]: value })
  }

  return (
    <div className="controls">
      <Stepper
        label="Round Length"
        value={config.roundSeconds}
        step={30}
        stepLabel="30s"
        min={30}
        format={formatDuration}
        onChange={(value) => update('roundSeconds', value)}
      />
      <Stepper
        label="Rest Length"
        value={config.restSeconds}
        step={10}
        stepLabel="10s"
        min={0}
        format={formatDuration}
        onChange={(value) => update('restSeconds', value)}
      />
      <Stepper
        label="Rounds"
        value={config.rounds}
        step={1}
        stepLabel="1"
        min={1}
        onChange={(value) => update('rounds', value)}
      />

      <button type="button" className="settings-toggle" onClick={() => setShowSettings(true)}>
        ⚙ Settings
      </button>

      {showSettings && (
        <SettingsModal config={config} update={update} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
