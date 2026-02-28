import { useState } from 'react'
import {
  DEFAULT_PERSONAS,
} from '../../constants'
import type { SpawnSettings } from '../../types'
import { Button } from '../shared/Button'

interface SpawnConfigProps {
  value: SpawnSettings
  onChange: (value: SpawnSettings) => void
}

export function SpawnConfig({ value, onChange }: SpawnConfigProps) {
  const [newPersona, setNewPersona] = useState('')

  function update(patch: Partial<SpawnSettings>) {
    onChange({ ...value, ...patch })
  }

  function addPersona() {
    const trimmed = newPersona.trim()
    if (!trimmed || value.personas.includes(trimmed)) return
    update({ personas: [...value.personas, trimmed] })
    setNewPersona('')
  }

  function removePersona(index: number) {
    update({ personas: value.personas.filter((_, i) => i !== index) })
  }

  function resetPersonas() {
    update({ personas: [...DEFAULT_PERSONAS] })
  }

  return (
    <div className="spawn-config">
      {/* Agent Count */}
      <div className="field">
        <label className="field-label">Agent Count</label>
        <div className="count-input">
          <button
            className="count-btn"
            onClick={() => update({ count: Math.max(2, value.count - 1) })}
            disabled={value.count <= 2}
          >
            −
          </button>
          <span className="count-value">{value.count}</span>
          <button
            className="count-btn"
            onClick={() => update({ count: Math.min(20, value.count + 1) })}
            disabled={value.count >= 20}
          >
            +
          </button>
        </div>
      </div>

      {/* Temperature Range */}
      <div className="field">
        <label className="field-label">Temperature Range</label>
        <div className="range-row">
          <div className="range-field">
            <span className="range-label">Min</span>
            <input
              type="number"
              className="input input-sm"
              value={value.tempMin}
              min={0}
              max={value.tempMax}
              step={0.1}
              onChange={(e) =>
                update({ tempMin: Math.max(0, Math.min(parseFloat(e.target.value) || 0, value.tempMax)) })
              }
            />
          </div>
          <span className="range-dash">—</span>
          <div className="range-field">
            <span className="range-label">Max</span>
            <input
              type="number"
              className="input input-sm"
              value={value.tempMax}
              min={value.tempMin}
              max={2}
              step={0.1}
              onChange={(e) =>
                update({ tempMax: Math.min(2, Math.max(parseFloat(e.target.value) || 0, value.tempMin)) })
              }
            />
          </div>
        </div>
      </div>

      {/* Persona Pool */}
      <div className="field">
        <label className="field-label">
          Persona Pool
          <Button variant="ghost" size="sm" onClick={resetPersonas} style={{ marginLeft: 8 }}>
            Reset
          </Button>
        </label>
        <div className="persona-chips">
          {value.personas.map((p, i) => (
            <span key={i} className="chip">
              <span className="chip-text">{p}</span>
              <button className="chip-remove" onClick={() => removePersona(i)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="persona-add">
          <input
            className="input"
            placeholder="Add a persona…"
            value={newPersona}
            onChange={(e) => setNewPersona(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPersona()}
          />
          <Button variant="secondary" size="sm" onClick={addPersona} disabled={!newPersona.trim()}>
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
