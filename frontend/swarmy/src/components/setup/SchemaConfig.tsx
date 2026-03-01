import { useState, useCallback, useMemo } from 'react'
import { SCHEMA_PRESETS } from '../../constants'
import type { ResponseFormat } from '../../types'
import { SchemaBuilder } from '../schema-builder/SchemaBuilder'
import type { SchemaDefinition, SchemaProperty } from '../schema-builder/types/schema'

interface SchemaConfigProps {
  value: ResponseFormat | null
  onChange: (value: ResponseFormat | null) => void
}

/** Convert a ResponseFormat schema object into SchemaBuilder's internal format */
function toBuilderSchema(rf: ResponseFormat): {
  schema: SchemaDefinition
  name: string
} {
  const s = rf.json_schema.schema as Record<string, unknown>
  const props = s.properties as Record<string, Record<string, unknown>>
  const required = (s.required as string[]) ?? []

  const properties: SchemaProperty[] = Object.entries(props).map(
    ([name, def]) => ({
      name,
      type: def.type as SchemaProperty['type'],
      description: (def.description as string) ?? '',
      required: required.includes(name),
      hasEnum: Array.isArray(def.enum),
      enum: (def.enum as (string | number)[]) ?? undefined,
    }),
  )

  return {
    schema: {
      properties,
      additionalProperties:
        (s.additionalProperties as boolean | undefined) ?? false,
    },
    name: rf.json_schema.name,
  }
}

export function SchemaConfig({ value, onChange }: SchemaConfigProps) {
  // bumping builderKey forces SchemaBuilder to re-mount with new initial data
  const [builderKey, setBuilderKey] = useState(0)
  const [presetId, setPresetId] = useState(SCHEMA_PRESETS[0].id)

  const activePreset = useMemo(
    () => SCHEMA_PRESETS.find((p) => p.id === presetId) ?? SCHEMA_PRESETS[0],
    [presetId],
  )

  const builderData = useMemo(() => toBuilderSchema(activePreset.schema), [activePreset])

  function handlePresetChange(id: string) {
    setPresetId(id)
    setBuilderKey((k) => k + 1) // re-mount builder with new preset
    const preset = SCHEMA_PRESETS.find((p) => p.id === id) ?? SCHEMA_PRESETS[0]
    onChange(preset.schema)
  }

  const handleBuilderChange = useCallback(
    (schemaJson: string) => {
      try {
        const parsed = JSON.parse(schemaJson)
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
  if (value === null) {
    onChange(activePreset.schema)
  }

  return (
    <div className="field">
      <label className="field-label">Response Schema</label>

      <div className="preset-grid">
        {SCHEMA_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={`preset-card ${presetId === preset.id ? 'preset-card-active' : ''}`}
            onClick={() => handlePresetChange(preset.id)}
          >
            <span className="preset-card-label">{preset.label}</span>
            <span className="preset-card-desc">{preset.description}</span>
          </button>
        ))}
      </div>

      <div className="schema-builder-wrapper">
        <SchemaBuilder
          key={builderKey}
          initialSchema={builderData.schema}
          initialSchemaName={builderData.name}
          initialStrictMode={true}
          showOutput={true}
          onSchemaChange={handleBuilderChange}
        />
      </div>
    </div>
  )
}
