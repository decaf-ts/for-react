import { useState } from 'react';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/as-graph/shared';
import type { GraphParameterRendererContract, GraphParameterValueIssue } from '../GraphParameterRendererContract.js';
import { GraphParameterFieldComponent } from './graph-parameter-field.component.js';

function primitiveItemParameter(): GraphParameterDefinition[] {
  return [{ id: 'value', label: 'value', type: 'string' } as GraphParameterDefinition];
}

function defaultItemRecordOf(itemParameters: GraphParameterDefinition[]): Record<string, GraphJsonValue> {
  const record: Record<string, GraphJsonValue> = {};
  for (const itemParameter of itemParameters) {
    if (itemParameter.defaultValue !== undefined) record[itemParameter.id] = itemParameter.defaultValue;
  }
  return record;
}

function joinPath(left: string, right?: string): string {
  return right ? `${left}.${right}` : left;
}

/**
 * @description Collection parameter renderer: add/remove rows of nested parameter renderers.
 * @summary Collection parameter renderer: add/remove rows of nested parameter renderers.
 * @memberOf module:for-react.diagrams
 */
export function GraphCollectionParameterComponent({
  parameter,
  value,
  disabled,
  context,
  onValueChange,
  onErrorChange,
}: GraphParameterRendererContract) {
  const definition = parameter as {
    itemParameters?: GraphParameterDefinition[];
    maxItems?: number;
  };
  const itemParameters = definition.itemParameters?.length
    ? definition.itemParameters
    : primitiveItemParameter();
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const maxItems = definition.maxItems ?? Number.MAX_SAFE_INTEGER;
  const canAdd = !disabled && items.length < maxItems;
  const canRemove = !disabled;
  const [issues, setIssues] = useState<Map<number, GraphParameterValueIssue[]>>(new Map());

  const emitItems = (next: unknown[]) => onValueChange(next as GraphJsonValue[]);

  const itemValue = (index: number, subParameter: GraphParameterDefinition): GraphJsonValue | undefined => {
    if (!definition.itemParameters?.length) return items[index] as GraphJsonValue | undefined;
    const item = items[index];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return undefined;
    return (item as Record<string, GraphJsonValue>)[subParameter.id];
  };

  const itemContext = (index: number) => {
    if (!context) return undefined;
    const item = items[index];
    const values =
      typeof item === 'object' && item !== null && !Array.isArray(item)
        ? (item as Record<string, GraphJsonValue>)
        : {};
    return { ...context, values };
  };

  const changeItem = (index: number, subParameter: GraphParameterDefinition, next: GraphJsonValue | undefined) => {
    const nextItems = [...items];
    if (!definition.itemParameters?.length) {
      nextItems[index] = next;
    } else {
      const item = nextItems[index];
      const record: Record<string, GraphJsonValue> =
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? { ...(item as Record<string, GraphJsonValue>) }
          : {};
      if (next === undefined) delete record[subParameter.id];
      else record[subParameter.id] = next;
      nextItems[index] = record;
    }
    emitItems(nextItems);
  };

  const changeErrors = (index: number, subParameter: GraphParameterDefinition, list: GraphParameterValueIssue[]) => {
    const remapped = list.map((issue) => ({
      ...issue,
      parameterId: parameter.id,
      path: `${index}.${joinPath(subParameter.id, issue.path)}`,
    }));
    setIssues((current) => {
      const next = new Map(current);
      if (remapped.length) next.set(index, remapped);
      else next.delete(index);
      onErrorChange?.([...next.entries()].sort(([a], [b]) => a - b).flatMap(([, entries]) => entries));
      return next;
    });
  };

  return (
    <div className="graph-collection-parameter">
      {items.map((_item, index) => (
        <div className="graph-collection-parameter-item" key={index}>
          {itemParameters.map((subParameter) => (
            <div className="graph-collection-parameter-field" key={subParameter.id}>
              <GraphParameterFieldComponent
                parameter={subParameter}
                value={itemValue(index, subParameter)}
                disabled={disabled}
                context={itemContext(index)}
                onValueChange={(next) => changeItem(index, subParameter, next)}
                onErrorChange={(list) => changeErrors(index, subParameter, list)}
              />
            </div>
          ))}
          {canRemove ? (
            <button
              type="button"
              className="graph-collection-parameter-remove"
              onClick={() => {
                const nextItems = [...items];
                nextItems.splice(index, 1);
                emitItems(nextItems);
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      {canAdd ? (
        <button
          type="button"
          className="graph-collection-parameter-add"
          onClick={() => emitItems([...items, defaultItemRecordOf(itemParameters)])}
        >
          Add
        </button>
      ) : null}
    </div>
  );
}

export default GraphCollectionParameterComponent;
