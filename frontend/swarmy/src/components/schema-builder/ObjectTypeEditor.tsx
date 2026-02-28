
import { Switch } from "./ui/switch";
import { Plus } from "lucide-react";
import type { SchemaProperty } from "./types/schema";
import { PropertyEditor } from "./PropertyEditor";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface ObjectTypeEditorProps {
  property: SchemaProperty;
  index: number;
  isStrictMode: boolean;
  enumInputValue: string;
  onPropertyUpdate: (index: number, updates: Partial<SchemaProperty>) => void;
  onEnumInputChange: (index: number, value: string) => void;
  onAddEnumValue: (index: number) => void;
  onRemoveEnumValue: (propertyIndex: number, enumIndex: number) => void;
  nestingLevel: number;
}

export function ObjectTypeEditor({
  property,
  index,
  isStrictMode,
  enumInputValue,
  onPropertyUpdate,
  onEnumInputChange,
  onAddEnumValue,
  onRemoveEnumValue,
  nestingLevel,
}: ObjectTypeEditorProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleAddNestedProperty = () => {
    const newProperties = [...(property.properties || []), {
      name: "",
      type: "string" as const,
      required: isStrictMode,
      hasEnum: false,
    }];
    onPropertyUpdate(index, { properties: newProperties });
  };

  const handleUpdateNestedProperty = (propertyIndex: number, updates: Partial<SchemaProperty>) => {
    const newProperties = [...(property.properties || [])];
    newProperties[propertyIndex] = { ...newProperties[propertyIndex], ...updates };
    onPropertyUpdate(index, { properties: newProperties });
  };

  const handleRemoveNestedProperty = (propertyIndex: number) => {
    const newProperties = property.properties?.filter((_, i) => i !== propertyIndex);
    onPropertyUpdate(index, { properties: newProperties });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().split('-')[1]);
      const newIndex = parseInt(over.id.toString().split('-')[1]);
      const newProperties = arrayMove(property.properties || [], oldIndex, newIndex);
      onPropertyUpdate(index, { properties: newProperties });
    }
  };

  return (
    <div className="sb-object-editor">
      <div className="sb-object-controls">
        <label className="sb-toggle-label">
          <Switch
            checked={property.additionalObjectProperties ?? false}
            onCheckedChange={(checked) =>
              onPropertyUpdate(index, { additionalObjectProperties: checked })
            }
          />
          <span>additional props</span>
        </label>
        <button className="btn btn-ghost btn-sm" onClick={handleAddNestedProperty}>
          <Plus className="w-3 h-3" /> add property
        </button>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={(property.properties || []).map((_, i) => `property-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          {property.properties?.map((prop, propIndex) => (
            <PropertyEditor
              key={propIndex}
              property={prop}
              index={propIndex}
              isStrictMode={isStrictMode}
              enumInputValue={enumInputValue}
              onPropertyUpdate={handleUpdateNestedProperty}
              onRemoveProperty={handleRemoveNestedProperty}
              onEnumInputChange={onEnumInputChange}
              onAddEnumValue={onAddEnumValue}
              onRemoveEnumValue={onRemoveEnumValue}
              nestingLevel={nestingLevel + 1}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
