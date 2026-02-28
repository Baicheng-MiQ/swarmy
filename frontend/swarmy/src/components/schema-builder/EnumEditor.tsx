
import { Switch } from "./ui/switch";
import { Plus, X } from "lucide-react";
import type { SchemaProperty } from "./types/schema";

interface EnumEditorProps {
  property: SchemaProperty;
  index: number;
  enumInputValue: string;
  onPropertyUpdate: (index: number, updates: Partial<SchemaProperty>) => void;
  onEnumInputChange: (index: number, value: string) => void;
  onAddEnumValue: (index: number) => void;
  onRemoveEnumValue: (propertyIndex: number, enumIndex: number) => void;
}

export function EnumEditor({
  property,
  index,
  enumInputValue,
  onPropertyUpdate,
  onEnumInputChange,
  onAddEnumValue,
  onRemoveEnumValue,
}: EnumEditorProps) {
  return (
    <div className="sb-enum">
      <label className="sb-toggle-label">
        <Switch
          checked={property.hasEnum}
          onCheckedChange={(checked) =>
            onPropertyUpdate(index, {
              hasEnum: checked,
              enum: checked ? [] : undefined,
            })
          }
        />
        <span>enum</span>
      </label>
      {property.hasEnum && (
        <div className="sb-enum-content">
          <div className="sb-enum-input-row">
            <input
              className="input input-sm"
              placeholder={`value${property.type === "number" ? " (number)" : ""}`}
              value={enumInputValue}
              onChange={(e) => onEnumInputChange(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddEnumValue(index);
                }
              }}
              type={property.type === "number" ? "number" : "text"}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => onAddEnumValue(index)}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {(property.enum?.length ?? 0) > 0 && (
            <div className="sb-enum-chips">
              {property.enum?.map((enumValue, enumIndex) => (
                <span key={enumIndex} className="sb-chip">
                  {String(enumValue)}
                  <button
                    className="sb-chip-x"
                    onClick={() => onRemoveEnumValue(index, enumIndex)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
