import { useMemo } from 'react'
import type { Agent, ResponseFormat } from '../../../types'
import {
  introspectSchema,
  extractValidRows,
  type VizField,
} from './schemaIntrospect'
import { EnumChart } from './EnumChart'
import { NumberChart } from './NumberChart'
import { CrossFieldChart } from './CrossFieldChart'
import { EnumFloatChart } from './EnumFloatChart'
import { StringCards } from './StringCards'

interface SwarmVizProps {
  agents: Agent[]
  responseFormat: ResponseFormat | null
}

export function SwarmViz({ agents, responseFormat }: SwarmVizProps) {
  const fields = useMemo(() => introspectSchema(responseFormat), [responseFormat])
  const rows = useMemo(() => extractValidRows(agents, responseFormat), [agents, responseFormat])

  // Classify fields
  const enumFields = fields.filter((f) => f.type === 'enum' || f.type === 'boolean')
  const numFields = fields.filter((f) => f.type === 'float' || f.type === 'int')
  const strFields = fields.filter((f) => f.type === 'string')

  // Cross-field pairs: enum × enum
  const enumPairs = useMemo(() => {
    const pairs: [VizField, VizField][] = []
    for (let i = 0; i < enumFields.length; i++) {
      for (let j = i + 1; j < enumFields.length; j++) {
        pairs.push([enumFields[i], enumFields[j]])
      }
    }
    return pairs
  }, [enumFields])

  // Enum × float pairs (for weighted voting / conviction charts)
  const enumFloatPairs = useMemo(() => {
    const pairs: [VizField, VizField][] = []
    for (const ef of enumFields) {
      for (const nf of numFields) {
        if (nf.type === 'float') {
          pairs.push([ef, nf])
        }
      }
    }
    // Limit to first 3 most interesting
    return pairs.slice(0, 3)
  }, [enumFields, numFields])

  if (fields.length === 0 || rows.length === 0) return null

  return (
    <div className="viz-section">
      {/* Per-field charts */}
      {enumFields.map((f) => (
        <EnumChart key={f.name} field={f} rows={rows} />
      ))}

      {numFields.map((f) => (
        <NumberChart key={f.name} field={f} rows={rows} />
      ))}

      {/* Combination charts */}
      {enumFloatPairs.map(([ef, nf]) => (
        <EnumFloatChart
          key={`${ef.name}-${nf.name}`}
          enumField={ef}
          floatField={nf}
          rows={rows}
        />
      ))}

      {enumPairs.map(([f1, f2]) => (
        <CrossFieldChart
          key={`${f1.name}-${f2.name}`}
          field1={f1}
          field2={f2}
          rows={rows}
        />
      ))}

      {/* String cards last */}
      {strFields.map((f) => (
        <StringCards key={f.name} field={f} rows={rows} />
      ))}
    </div>
  )
}
