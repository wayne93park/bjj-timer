import { useState } from 'react'
import { TIME_UP_SOUND_OPTIONS, playTimeUpSound, playHeadsUpSound } from '../utils/sound'

const STEP_SECONDS = 30

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function DurationStepper({ label, seconds, min, disabled, onChange }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-control">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(Math.max(min, seconds - STEP_SECONDS))}
        >
          − 30s
        </button>
        <span className="stepper-value">{formatDuration(seconds)}</span>
        <button type="button" disabled={disabled} onClick={() => onChange(seconds + STEP_SECONDS)}>
          + 30s
        </button>
      </div>
    </div>
  )
}

export default function Controls({ config, onChange, disabled }) {
  const [showSettings, setShowSettings] = useState(false)

  function update(field, value) {
    onChange({ ...config, [field]: value })
  }

  return (
    <div className="controls">
      <div className="controls-row">
        <DurationStepper
          label="Round Length"
          seconds={config.roundSeconds}
          min={STEP_SECONDS}
          disabled={disabled}
          onChange={(value) => update('roundSeconds', value)}
        />
        <DurationStepper
          label="Rest Length"
          seconds={config.restSeconds}
          min={0}
          disabled={disabled}
          onChange={(value) => update('restSeconds', value)}
        />
      </div>

      <div className="controls-row">
        <label>
          Rounds
          <input
            type="number"
            min="1"
            value={config.rounds}
            disabled={disabled}
            onChange={(e) => update('rounds', Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <button type="button" className="settings-toggle" onClick={() => setShowSettings((s) => !s)}>
          ⚙ Settings
        </button>
      </div>

      {showSettings && (
        <>
          <div className="controls-row">
            <label>
              Time's Up Sound
              <select value={config.sound} onChange={(e) => update('sound', e.target.value)}>
                {TIME_UP_SOUND_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="preview-button"
              disabled={config.sound === 'none'}
              onClick={() => playTimeUpSound(config.sound)}
            >
              ▶ Preview
            </button>
          </div>

          <div className="controls-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.headsUpEnabled}
                disabled={disabled}
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
              ▶ Preview
            </button>
          </div>

          <div className="controls-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.keepScreenOn}
                disabled={disabled}
                onChange={(e) => update('keepScreenOn', e.target.checked)}
              />
              Keep Screen On While Running
            </label>
          </div>
        </>
      )}
    </div>
  )
}
