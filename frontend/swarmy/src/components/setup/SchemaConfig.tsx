import { useState } from 'react'
import { DEFAULT_SCHEMA } from '../../constants'
import type { ResponseFormat } from '../../types'

interface SchemaConfigProps {
  value: ResponseFormat | null
  onChange: (value: ResponseFormat | null) => void
}

export function SchemaConfig({ value, onChange }: SchemaConfigProps) {
  const [mode, setMode] = useState<'default' | 'custom'>(value === null ? 'default' : 'default')
  const [customText, setCustomText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  function handleModeChange(m: 'default' | 'custom') {
    setMode(m)
    setParseError(null)
    if (m === 'default') {
      onChange(DEFAULT_SCHEMA)
    } else {
      // Try to parse existing custom text
      if (customText.trim()) {
        try {
          const parsed = JSON.parse(customText)
          onChange(parsed)
        } catch {
          onChange(null)
        }
      } else {
        onChange(null)
      }
    }
  }

  function handleCustomChange(text: string) {
    setCustomText(text)
    setParseError(null)
    if (!text.trim()) {
      onChange(null)
      return
    }
    try {
      const parsed = JSON.parse(text)
      onChange(parsed)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON')
      onChange(null)
    }
  }

  // Initialize with default
  if (value === null && mode === 'default') {
    onChange(DEFAULT_SCHEMA)
  }

  return (
    <div className="field">
      <label className="field-label">Response Schema</label>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${mode === 'default' ? 'toggle-btn-active' : ''}`}
          onClick={() => handleModeChange('default')}
        >
          Default
        </button>
        <button
          className={`toggle-btn ${mode === 'custom' ? 'toggle-btn-active' : ''}`}
          onClick={() => handleModeChange('custom')}
        >
          Custom
        </button>
      </div>

      {mode === 'default' ? (
        <pre className="code-block">
          {JSON.stringify(DEFAULT_SCHEMA.json_schema.schema, null, 2)}
        </pre>
      ) : (
        <>
          <textarea
            className="input input-textarea input-code"
            placeholder='Paste a ResponseFormat JSON object…'
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            rows={8}
          />
          {parseError && (
            <div className="field-error">{parseError}</div>
          )}
        </>
      )}
    </div>
  )
}
