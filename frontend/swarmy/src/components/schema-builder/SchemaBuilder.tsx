import { useSchemaState } from "./utils/useSchemaState";
import { PropertyEditor } from "./PropertyEditor";
import { SchemaOutput } from "./SchemaOutput";
import { generateSchemaJSON, validateSchema } from "./utils/schemaUtils";
import type { ValidationError } from "./utils/schemaUtils";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { SchemaDefinition } from "./types/schema";
import React from "react";
import { Switch } from "./ui/switch";
import { Plus } from "lucide-react";

interface SchemaBuilderProps {
  initialSchema?: SchemaDefinition;
  initialStrictMode?: boolean;
  initialSchemaName?: string;
  showOutput?: boolean;
  onSchemaChange?: (schema: string) => void;
}

export const SchemaBuilder = ({
  initialSchema,
  initialStrictMode = true,
  initialSchemaName = "schema_definition",
  showOutput = true,
  onSchemaChange,
}: SchemaBuilderProps) => {
  const {
    schema,
    isStrictMode,
    schemaName,
    setSchemaName,
    enumInputValues,
    setEnumInputValues,
    addProperty,
    removeProperty,
    updateProperty,
    handlePropertyReorder,
    handleStrictModeChange,
  } = useSchemaState(initialSchema, initialStrictMode, initialSchemaName);

  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [nameError, setNameError] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 3 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = schema.properties.findIndex((_, i) => `property-${i}` === active.id);
      const newIndex = schema.properties.findIndex((_, i) => `property-${i}` === over.id);
      handlePropertyReorder(oldIndex, newIndex);
    }
  };

  const handleCopySchema = () => {
    const schemaString = generateSchemaJSON(schema, isStrictMode, schemaName);
    navigator.clipboard.writeText(schemaString);
  };

  const handleNameChange = (name: string) => {
    const pattern = /^[a-zA-Z0-9_-]*$/;
    setNameError(!pattern.test(name) ? "Only alphanumeric, underscore, hyphen" : null);
    setSchemaName(name);
  };

  React.useEffect(() => {
    onSchemaChange?.(generateSchemaJSON(schema, isStrictMode, schemaName));
  }, [schema, isStrictMode, schemaName, onSchemaChange]);

  React.useEffect(() => {
    setValidationErrors(validateSchema(schema));
  }, [schema]);

  return (
    <div className="sb-root">
      {/* Header row */}
      <div className="sb-header">
        <input
          className="input input-sm sb-name-input"
          value={schemaName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="schema_name"
        />
        <div className="sb-header-controls">
          <label className="sb-toggle-label">
            <Switch checked={isStrictMode} onCheckedChange={handleStrictModeChange} />
            <span>strict</span>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={addProperty}>
            <Plus className="w-3 h-3" /> add
          </button>
        </div>
      </div>
      {nameError && <p className="field-error">{nameError}</p>}

      {/* Properties */}
      <div className="sb-properties">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={schema.properties.map((_, i) => `property-${i}`)} strategy={verticalListSortingStrategy}>
            {schema.properties.map((property, index) => (
              <PropertyEditor
                key={index}
                property={property}
                index={index}
                isStrictMode={isStrictMode}
                enumInputValue={enumInputValues[index] || ""}
                validationErrors={validationErrors}
                onPropertyUpdate={updateProperty}
                onRemoveProperty={removeProperty}
                onEnumInputChange={(index, value) =>
                  setEnumInputValues((prev) => ({ ...prev, [index]: value }))
                }
                onAddEnumValue={(index) => {
                  const value = enumInputValues[index]?.trim();
                  if (!value) return;
                  const prop = schema.properties[index];
                  const processed = prop.type === "number" ? Number(value) : value;
                  if (prop.type === "number" && isNaN(Number(processed))) return;
                  updateProperty(index, { enum: [...(prop.enum || []), processed] });
                  setEnumInputValues((prev) => ({ ...prev, [index]: "" }));
                }}
                onRemoveEnumValue={(propertyIndex, enumIndex) => {
                  const prop = schema.properties[propertyIndex];
                  if (!prop.enum) return;
                  updateProperty(propertyIndex, {
                    enum: prop.enum.filter((_, i) => i !== enumIndex),
                  });
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Output */}
      {showOutput && (
        <SchemaOutput
          schemaJson={generateSchemaJSON(schema, isStrictMode, schemaName)}
          onCopySchema={handleCopySchema}
          hasErrors={validationErrors.length > 0}
        />
      )}
    </div>
  );
};

export default SchemaBuilder;
