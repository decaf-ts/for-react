import React from "react";
import { RgxComponentRenderer } from "../component-renderer/RgxComponentRenderer.js";
import { RgxCard } from "../card/RgxCard.js";
import { ReactEngineKeys } from "../../engine/constants.js";
import { KeyValue } from "../../engine/types.js";
import { translateKey } from "../../services/RgxTranslateService.js";
import { getRgxRenderingEngine } from "../../engine/RgxRenderingEngine.js";
import type { FieldDefinition } from "@decaf-ts/ui-decorators";
import type { ControlFieldProps } from "../../engine/types.js";

/**
 * @description Describes a single column within a {@link LayoutRow}.
 * @summary Carries the renderable tag, optional column width and CSS class,
 * arbitrary props forwarded to the rendered component, nested child
 * definitions, form linkage and the field definition used by the rendering
 * engine.
 * @memberOf module:for-react
 */
export interface LayoutColumn extends KeyValue {
  tag: string;
  colClass?: string;
  col?: string | number;
  props?: KeyValue;
  children?: KeyValue[];
  parentForm?: KeyValue;
  formGroup?: KeyValue;
  definition?: FieldDefinition<ControlFieldProps>;
}

/**
 * @description Describes one horizontal row of columns in a layout.
 * @summary Pairs an optional translated title with the columns to render in
 * that row.
 * @memberOf module:for-react
 */
export interface LayoutRow {
  title?: string;
  cols: LayoutColumn[];
}

/**
 * @description Public props accepted by the {@link RgxLayout} component.
 * @summary Configures the rows or child definitions to render, column count,
 * grid behaviour, spacing, borders, card presentation and the form context
 * shared by rendered columns.
 * @memberOf module:for-react
 */
export interface RgxLayoutProps {
  rows?: LayoutRow[] | number | string[];
  cols?: string[] | number;
  gap?: "small" | "medium" | "large" | "collapse" | "";
  grid?: boolean;
  match?: boolean;
  borders?: boolean;
  cardBody?: "default" | "small" | "blank";
  cardType?: "clear" | "shadow";
  className?: string;
  parentForm?: KeyValue;
  childrenDefinitions?: KeyValue[];
  definition?: FieldDefinition<ControlFieldProps>;
}

const toArray = <T,>(value?: T[] | number): T[] => {
  if (typeof value === "number") {
    return Array.from({ length: value }) as T[];
  }
  return (value as T[]) || [];
};

function columnsFromDefinitions(
  definitions: KeyValue[]
): LayoutColumn[] {
  return definitions.map((definition) => {
    const props = (definition.props || {}) as KeyValue;
    return {
      tag: String(definition.tag || ""),
      col: props.col as string | number | undefined,
      colClass: props.colClass as string | undefined,
      props,
      children: (definition.children || []) as KeyValue[],
      definition: definition as unknown as FieldDefinition<ControlFieldProps>,
    };
  });
}

function definitionRow(definition: KeyValue): number {
  const props = (definition.props || {}) as KeyValue;
  const row = Number(props.row);
  return Number.isFinite(row) && row > 0 ? row : 1;
}

/**
 * @description Grid layout that arranges rows and columns of rendered components.
 * @summary Normalises `rows` from an array of {@link LayoutRow} objects, a
 * number of empty rows, or an array of string titles. When
 * `childrenDefinitions` is supplied it takes precedence: definitions are
 * grouped into rows using their `props.row` value treating missing or invalid
 * values as row 1. Each column is rendered through the rendering engine when a
 * `definition` is present, otherwise via {@link RgxComponentRenderer}; columns
 * tagged `ngx-decaf-crud-form` are wrapped in a {@link RgxCard}. Grid, gap,
 * match, border and column-width classes are derived from the corresponding
 * props. Returns `null` when there are no rows to render.
 * @param {RgxLayoutProps} props - Component properties.
 * @returns {React.ReactElement | null} The rendered layout section, or `null`
 * when no rows are available.
 * @memberOf module:for-react
 */
export const RgxLayout: React.FC<RgxLayoutProps> = ({
  rows = [],
  cols = 1,
  gap = "small",
  grid = true,
  match = false,
  borders = false,
  cardBody = "default",
  cardType = "clear",
  className = "",
  parentForm,
  childrenDefinitions = [],
}) => {
  const rowTitles =
    Array.isArray(rows) && typeof rows[0] === "string"
      ? (rows as string[])
      : [];

  const normalizedRows: LayoutRow[] = childrenDefinitions.length
    ? Array.from(
        {
          length: Math.max(
            rowTitles.length,
            ...childrenDefinitions.map(definitionRow)
          ),
        },
        (_value, index) => ({
          title: rowTitles[index],
          cols: columnsFromDefinitions(
            childrenDefinitions.filter(
              (definition) => definitionRow(definition) === index + 1
            )
          ),
        })
      ).filter((row) => row.cols.length > 0)
    : typeof rows === "number"
    ? toArray<LayoutRow>(rows)
    : (rows as LayoutRow[]);

  if (!normalizedRows?.length) {
    return null;
  }

  const columnClass = (col: LayoutColumn) => {
    const base = ["dcf-grid-col", col.colClass];
    if (col.col === "full") base.push("dcf-grid-col-full");
    else if (typeof col.col === "number" && typeof cols === "number") {
      base.push(`dcf-width-1-${Math.max(cols, col.col)}`);
    }
    return base.filter(Boolean).join(" ");
  };

  return (
    <section className="dcf-layout-container">
      {normalizedRows.map((row, rowIndex) => {
        if (!row?.cols?.length) return null;
        const rowClasses = [
          grid ? "dcf-layout-row dcf-grid" : "dcf-layout-row",
          gap ? `dcf-grid-${gap}` : "",
          match ? "dcf-grid-match" : "",
          borders ? "dcf-grid-bordered" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div className={rowClasses} key={`row-${rowIndex}`}>
            {row.title && (
              <div className="dcf-width-1-1 dcf-grid-title">
                <h3>{translateKey(row.title)}</h3>
              </div>
            )}
            {row.cols.map((col, colIndex) => {
              const sharedProps = {
                tag: col.tag,
                globals: {
                  props: {
                    ...(col.props || {}),
                    [ReactEngineKeys.CHILDREN_DEFINITIONS]: col.children || [],
                  },
                },
                projectable: false,
                parent: parentForm || col.parentForm || col.formGroup,
                className: match ? "dcf-height-1-1 dcf-card-layout" : undefined,
              };
              const renderedDefinition = col.definition
                ? getRgxRenderingEngine().renderFieldDefinition(
                    col.definition
                  )
                : null;
              const content =
                col.tag === "ngx-decaf-crud-form" ? (
                  <RgxCard body={cardBody} type={cardType}>
                    {renderedDefinition || <RgxComponentRenderer {...sharedProps} />}
                  </RgxCard>
                ) : (
                  renderedDefinition || <RgxComponentRenderer {...sharedProps} />
                );
              return (
                <div
                  className={columnClass(col)}
                  key={`col-${rowIndex}-${colIndex}`}
                >
                  <div>{content}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
};
