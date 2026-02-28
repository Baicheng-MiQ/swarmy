import { Switch } from "./ui/switch";
import { Trash2, GripVertical, AlertTriangle } from "lucide-react";
import type { SchemaProperty } from "./types/schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EnumEditor } from "./EnumEditor";
import { ArrayTypeEditor } from "./ArrayTypeEditor";
import { ObjectTypeEditor } from "./ObjectTypeEditor";
import type { ValidationError } from "./utils/schemaUtils";

interface PropertyEditorProps {
  property: SchemaProperty;
  index: number;
  isStrictMode: boolean;
  enumInputValue: string;
  validationErrors?: ValidationError[];
  onPropertyUpdate: (index: number, updates: Partial<SchemaProperty>) => void;
  onRemoveProperty: (index: number) => void;
  onEnumInputChange: (index: number, value: string) => void;
  onAddEnumValue: (index: number) => void;
  onRemoveEnumValue: (propertyIndex: number, enumIndex: number) => void;
  nestingLevel?: number;
}

export function PropertyEditor({
  property,
  index,
  isStrictMode,
  enumInputValue,
  validationErrors = [],
  onPropertyUpdate,
  onRemoveProperty,
  onEnumInputChange,
  onAddEnumValue,
  onRemoveEnumValue,
  nestingLevel = 0,
}: PropertyEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `property-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0.7 : undefined,
  };

  const propertyErrors = validationErrors.filter(error => 
    error.path === `root[${index}]` || error.path.startsWith(`root[${index}].${property.name}`)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sb-property ${nestingLevel > 0 ? 'sb-property-nested' : ''} ${propertyErrors.length > 0 ? 'sb-property-error' : ''}`}
    >
      {propertyErrors.length > 0 && (
        <div className="sb-errors">
          <AlertTriangle className="w-3 h-3" />
          {propertyErrors.map((error, i) => (
            <span key={i}>{error.message}</span>
          ))}
        </div>
      )}
      {/* Row 1: name, type, required, delete */}
      <div className="sb-property-row">
        <button
          className="sb-grip"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <input
          className="input input-sm sb-name-field"
          placeholder="name"
          value={property.name}
          onChange={(e) => onPropertyUpdate(index, { name: e.target.value })}
        />
        <select
          className="input input-sm input-select sb-type-field"
          value={property.type}
          onChange={(e) => {
            const value = e.target.value;
            onPropertyUpdate(index, {
              type: value as SchemaProperty["type"],
              items: value === "array" ? { type: "string" } : undefined,
              properties: value === "object" ? [] : undefined,
              additionalObjectProperties: value === "object" ? false : undefined,
            });
          }}
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
        </select>
        <label className="sb-toggle-label">
          <Switch
            checked={property.required}
            onCheckedChange={(checked) =>
              onPropertyUpdate(index, { required: checked })
            }
            disabled={isStrictMode}
          />
          <span>req</span>
        </label>
        <button
          className="sb-delete"
          onClick={() => onRemoveProperty(index)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Row 2: description */}
      <input
        className="input input-sm sb-desc-field"
        placeholder="description (optional)"
        value={property.description || ""}
        onChange={(e) => onPropertyUpdate(index, { description: e.target.value })}
      />
      {/* Conditional editors */}
      {(property.type === "string" || property.type === "number") && (
        <EnumEditor
          property={property}
          index={index}
          enumInputValue={enumInputValue}
          onPropertyUpdate={onPropertyUpdate}
          onEnumInputChange={onEnumInputChange}
          onAddEnumValue={onAddEnumValue}
          onRemoveEnumValue={onRemoveEnumValue}
        />
      )}
      {property.type === "array" && (
        <ArrayTypeEditor
          property={property}
          index={index}
          onPropertyUpdate={onPropertyUpdate}
        />
      )}
      {property.type === "object" && (
        <ObjectTypeEditor
          property={property}
          index={index}
          isStrictMode={isStrictMode}
          enumInputValue={enumInputValue}
          onPropertyUpdate={onPropertyUpdate}
          onEnumInputChange={onEnumInputChange}
          onAddEnumValue={onAddEnumValue}
          onRemoveEnumValue={onRemoveEnumValue}
          nestingLevel={nestingLevel}
        />
      )}
    </div>
  );
}
