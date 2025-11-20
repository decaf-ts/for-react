import React from "react";
import { RgxComponentRenderer } from "../component-renderer/RgxComponentRenderer";
import { RgxCard } from "../card/RgxCard";
import { ReactEngineKeys } from "../../engine/constants";
import { KeyValue } from "../../engine/types";
import "./layout.component.css";

export interface LayoutColumn extends KeyValue {
  tag: string;
  colClass?: string;
  col?: string | number;
  props?: KeyValue;
  children?: KeyValue[];
  parentForm?: KeyValue;
  formGroup?: KeyValue;
}

export interface LayoutRow {
  title?: string;
  cols: LayoutColumn[];
}

export interface RgxLayoutProps {
  rows?: LayoutRow[] | number;
  cols?: string[] | number;
  gap?: "small" | "medium" | "large" | "collapse" | "";
  grid?: boolean;
  match?: boolean;
  borders?: boolean;
  cardBody?: "default" | "small" | "blank";
  cardType?: "clear" | "shadow";
  className?: string;
  parentForm?: KeyValue;
}

const toArray = <T,>(value?: T[] | number): T[] => {
  if (typeof value === "number") {
    return Array.from({ length: value }) as T[];
  }
  return (value as T[]) || [];
};

export const RgxLayout: React.FC<RgxLayoutProps> = ({
  rows = [],
  gap = "small",
  grid = true,
  match = false,
  borders = false,
  cardBody = "default",
  cardType = "clear",
  className = "",
  parentForm,
}) => {
  const normalizedRows: LayoutRow[] = typeof rows === "number" ? toArray<LayoutRow>(rows) : rows;

  if (!normalizedRows?.length) {
    return null;
  }

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
                <h3>{row.title}</h3>
              </div>
            )}
            {row.cols.map((col, colIndex) => {
              const colClass = ["dcf-grid-col", col.colClass, col.col === "full" ? "dcf-grid-col-full" : ""]
                .filter(Boolean)
                .join(" ");
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
              const content =
                col.tag === "ngx-decaf-crud-form" ? (
                  <RgxCard body={cardBody} type={cardType}>
                    <RgxComponentRenderer {...sharedProps} />
                  </RgxCard>
                ) : (
                  <RgxComponentRenderer {...sharedProps} />
                );
              return (
                <div className={colClass} key={`col-${rowIndex}-${colIndex}`}>
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
