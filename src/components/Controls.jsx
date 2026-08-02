import { useState } from 'react'
import { TIME_UP_SOUND_OPTIONS, playTimeUpSound, playHeadsUpSound } from '../utils/sound'

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function Stepper({ label, value, step, stepLabel, min, format, disabled, onChange }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-control">
        <button type="button" disabled={disabled} onClick={() => onChange(Math.max(min, value - step))}>
          − {stepLabel}
        </button>
        <span className="stepper-value">{format ? format(value) : value}</span>
        <button type="button" disabled={disabled} onClick={() => onChange(value + step)}>
          + {stepLabel}
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
        <Stepper
          label="Round Length"
          value={config.roundSeconds}
          step={30}
          stepLabel="30s"
          min={30}
          format={formatDuration}
          disabled={disabled}
          onChange={(value) => update('roundSeconds', value)}
        />
        <Stepper
          label="Rest Length"
          value={config.restSeconds}
          step={30}
          stepLabel="30s"
          min={0}
          format={formatDuration}
          disabled={disabled}
          onChange={(value) => update('restSeconds', value)}
        />
        <Stepper
          label="Rounds"
          value={config.rounds}
          step={1}
          stepLabel="1"
          min={1}
          disabled={disabled}
          onChange={(value) => update('rounds', value)}
        />
      </div>

      <div className="controls-row">
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
