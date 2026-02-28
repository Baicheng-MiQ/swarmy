import { useState, useCallback } from 'react'
import { DEFAULT_SCHEMA } from '../../constants'
import type { ResponseFormat } from '../../types'
import { SchemaBuilder } from '../schema-builder/SchemaBuilder'
import type { SchemaDefinition } from '../schema-builder/types/schema'

interface SchemaConfigProps {
  value: ResponseFormat | null
  onChange: (value: ResponseFormat | null) => void
}

/** Convert our default schema into SchemaBuilder's internal format */
const DEFAULT_BUILDER_SCHEMA: SchemaDefinition = {
  properties: [
    {
      name: 'verdict',
      type: 'string',
      description: 'Your vote on the question.',
      required: true,
      hasEnum: true,
      enum: ['yes', 'no', 'abstain'],
    },
    {
      name: 'confidence',
      type: 'number',
      description: 'How confident you are in your verdict, from 0 to 1.',
      required: true,
      hasEnum: false,
    },
    {
      name: 'reasoning',
      type: 'string',
      description: 'A short explanation of your reasoning.',
      required: true,
      hasEnum: false,
    },
  ],
  additionalProperties: false,
}

export function SchemaConfig({ value, onChange }: SchemaConfigProps) {
  const [mode, setMode] = useState<'default' | 'builder'>('default')

  function handleModeChange(m: 'default' | 'builder') {
    setMode(m)
    if (m === 'default') {
      onChange(DEFAULT_SCHEMA)
    }
    // builder mode: will fire via onSchemaChange callback
  }

  const handleBuilderChange = useCallback(
    (schemaJson: string) => {
      try {
        const parsed = JSON.parse(schemaJson)
        // parsed is { name, strict, schema } — wrap it into ResponseFormat
        const rf: ResponseFormat = {
          type: 'json_schema',
          json_schema: parsed,
        }
        onChange(rf)
      } catch {
        // ignore parse errors during editing
      }
    },
    [onChange],
  )

  // Initialize with default on first render
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
          className={`toggle-btn ${mode === 'builder' ? 'toggle-btn-active' : ''}`}
          onClick={() => handleModeChange('builder')}
        >
          Builder
        </button>
      </div>

      {mode === 'default' ? (
        <pre className="code-block">
          {JSON.stringify(DEFAULT_SCHEMA.json_schema.schema, null, 2)}
        </pre>
      ) : (
        <div className="schema-builder-wrapper">
          <SchemaBuilder
            initialSchema={DEFAULT_BUILDER_SCHEMA}
            initialSchemaName="democracy_vote"
            initialStrictMode={true}
            showOutput={true}
            onSchemaChange={handleBuilderChange}
          />
        </div>
      )}
    </div>
  )
}
