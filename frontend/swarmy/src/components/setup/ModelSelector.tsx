import { useState, useMemo } from 'react'
import type { Model } from '../../types'

interface ModelSelectorProps {
  models: Model[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
}

/** Group models by provider family (first segment of ID) */
function getFamily(modelId: string): string {
  return modelId.split('/')[0] ?? modelId
}

export function ModelSelector({ models, selected, onChange }: ModelSelectorProps) {
  const [search, setSearch] = useState('')

  const families = useMemo(() => {
    const map = new Map<string, Model[]>()
    for (const m of models) {
      const fam = getFamily(m.id)
      if (!map.has(fam)) map.set(fam, [])
      map.get(fam)!.push(m)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [models])

  const filtered = useMemo(() => {
    if (!search.trim()) return families
    const q = search.toLowerCase()
    return families
      .map(([fam, items]) => {
        const matched = items.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q)
        )
        return [fam, matched] as [string, Model[]]
      })
      .filter(([, items]) => items.length > 0)
  }, [families, search])

  const allIds = models.map((m) => m.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      onChange(new Set())
    } else {
      onChange(new Set(allIds))
    }
  }

  function toggleFamily(familyModels: Model[]) {
    const ids = familyModels.map((m) => m.id)
    const allFamSelected = ids.every((id) => selected.has(id))
    const next = new Set(selected)
    if (allFamSelected) {
      ids.forEach((id) => next.delete(id))
    } else {
      ids.forEach((id) => next.add(id))
    }
    onChange(next)
  }

  function toggleModel(modelId: string) {
    const next = new Set(selected)
    if (next.has(modelId)) {
      next.delete(modelId)
    } else {
      next.add(modelId)
    }
    onChange(next)
  }

  return (
    <div className="model-selector">
      {/* Toolbar */}
      <div className="model-selector-toolbar">
        <input
          type="text"
          className="input input-sm model-selector-search"
          placeholder="Filter models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleAll}
          type="button"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="model-selector-count">
          {selected.size}/{models.length}
        </span>
      </div>

      {/* Model list */}
      <div className="model-selector-list">
        {filtered.map(([family, items]) => {
          const famIds = items.map((m) => m.id)
          const allFamSelected = famIds.every((id) => selected.has(id))
          const someFamSelected = famIds.some((id) => selected.has(id))

          return (
            <div key={family} className="model-selector-family">
              <label className="model-selector-family-header">
                <input
                  type="checkbox"
                  checked={allFamSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFamSelected && !allFamSelected
                  }}
                  onChange={() => toggleFamily(items)}
                />
                <span className="model-selector-family-name">{family}</span>
                <span className="model-selector-family-count">
                  {famIds.filter((id) => selected.has(id)).length}/{items.length}
                </span>
              </label>
              <div className="model-selector-items">
                {items.map((m) => (
                  <label key={m.id} className="model-selector-item">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleModel(m.id)}
                    />
                    <span className="model-selector-item-name">{m.name || m.id}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="model-selector-empty">No models match "{search}"</div>
        )}
      </div>
    </div>
  )
}
