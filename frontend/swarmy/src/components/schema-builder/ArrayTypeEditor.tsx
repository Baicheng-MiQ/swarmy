
import type { SchemaProperty } from "./types/schema";

interface ArrayTypeEditorProps {
  property: SchemaProperty;
  index: number;
  onPropertyUpdate: (index: number, updates: Partial<SchemaProperty>) => void;
}

export function ArrayTypeEditor({
  property,
  index,
  onPropertyUpdate,
}: ArrayTypeEditorProps) {
  return (
    <div className="sb-array-type">
      <span className="field-label-sm">items type</span>
      <select
        className="input input-sm input-select sb-type-field"
        value={property.items?.type || "string"}
        onChange={(e) =>
          onPropertyUpdate(index, {
            items: { type: e.target.value as Exclude<SchemaProperty["type"], "array"> }
          })
        }
      >
        <option value="string">string</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="object">object</option>
      </select>
    </div>
  );
}
