interface PromptInputProps {
  value: string
  onChange: (value: string) => void
}

export function PromptInput({ value, onChange }: PromptInputProps) {
  return (
    <div className="field">
      <label className="field-label">Prompt</label>
      <textarea
        className="input input-textarea"
        placeholder="Ask your swarm a question…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    </div>
  )
}
