import React, { useState } from "react";
import { OrderDirection } from "@decaf-ts/core";
import { IFilterQuery, IFilterQueryItem, ISortObject } from "../../engine/interfaces.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description Default set of filter condition labels offered by {@link RgxFilter}.
 * @summary Used as the `conditions` prop default and supplies the options
 * displayed in each filter row's condition selector.
 * @memberOf module:for-react
 */
export const DefaultFilterConditions = [
  "Equal",
  "Contains",
  "Not Contains",
  "Greater Than",
  "Less Than",
  "Not Equal",
];

/**
 * @description Public props accepted by the {@link RgxFilter} component.
 * @summary Configures the available conditions, the sortable columns, whether
 * multiple filter rows may be added, locale keys and the callbacks that receive
 * search text and the assembled filter query.
 * @memberOf module:for-react
 */
export interface RgxFilterProps {
  multiple?: boolean;
  conditions?: string[];
  sortOptions?: { label: string; value: string }[];
  disableSort?: boolean;
  className?: string;
  locale?: string;
  value?: IFilterQuery;
  onFilter?: (query: IFilterQuery | undefined) => void;
  onSearch?: (value: string) => void;
}

interface FilterRow extends IFilterQueryItem {
  key: string;
}

/**
 * @description Search bar with attribute/condition/value filter rows and sorting.
 * @summary Maintains local state for the search term, filter rows and sort
 * selection, emitting an {@link IFilterQuery} through `onFilter` whenever a row
 * or the sort changes. Rows without an attribute or value are omitted from the
 * emitted query; when no rows qualify the query is emitted as `undefined`.
 * Filter rows can only be added or removed when `multiple` is true, and the
 * sort controls are hidden when `disableSort` is set. The clear action resets
 * the rows and emits `undefined`; the search field reports each change through
 * `onSearch`.
 * @param {RgxFilterProps} props - Component properties.
 * @returns {React.ReactElement} The rendered filter and sort controls.
 * @memberOf module:for-react
 */
export const RgxFilter: React.FC<RgxFilterProps> = ({
  multiple = true,
  conditions = DefaultFilterConditions,
  sortOptions = [],
  disableSort = false,
  className = "",
  locale = "filter",
  value,
  onFilter,
  onSearch,
}) => {
  const [rows, setRows] = useState<FilterRow[]>([
    { key: "0", index: "", condition: conditions[0], value: "" },
  ]);
  const [sort, setSort] = useState<ISortObject>(
    value?.sort || {
      value: sortOptions[0]?.value || "",
      direction: OrderDirection.ASC,
    }
  );
  const [search, setSearch] = useState("");

  const emit = (nextRows: FilterRow[], nextSort: ISortObject) => {
    const query = nextRows
      .filter((row) => row.index || row.value)
      .map((row): IFilterQueryItem => ({
        index: row.index,
        condition: row.condition,
        value: row.value,
      }));
    onFilter?.({ query: query.length ? query : undefined, sort: nextSort });
  };

  const updateRow = (index: number, patch: Partial<FilterRow>) => {
    const next = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row
    );
    setRows(next);
    emit(next, sort);
  };

  const addRow = () => {
    const next = [
      ...rows,
      {
        key: String(rows.length),
        index: "",
        condition: conditions[0],
        value: "",
      },
    ];
    setRows(next);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    setRows(next.length ? next : [{ key: "0", index: "", condition: conditions[0], value: "" }]);
    emit(next, sort);
  };

  const updateSort = (patch: Partial<ISortObject>) => {
    const next = { ...sort, ...patch };
    setSort(next);
    emit(rows, next);
  };

  const clear = () => {
    const next = [{ key: "0", index: "", condition: conditions[0], value: "" }];
    setRows(next);
    onFilter?.(undefined);
  };

  return (
    <div className={["dcf-filter", className].filter(Boolean).join(" ")}>
      <div className="dcf-filter-search">
        <input
          type="search"
          value={search}
          placeholder={translateKey(`${locale}.search`) || "Search"}
          onChange={(event) => {
            setSearch(event.target.value);
            onSearch?.(event.target.value);
          }}
        />
      </div>

      {rows.map((row, index) => (
        <div className="dcf-filter-row" key={row.key}>
          <input
            aria-label={translateKey(`${locale}.attribute`) || "Attribute"}
            value={row.index || ""}
            placeholder={translateKey(`${locale}.attribute`) || "Attribute"}
            onChange={(event) => updateRow(index, { index: event.target.value })}
          />
          <select
            aria-label={translateKey(`${locale}.condition`) || "Condition"}
            value={row.condition}
            onChange={(event) =>
              updateRow(index, { condition: event.target.value })
            }
          >
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
          <input
            aria-label={translateKey(`${locale}.value`) || "Value"}
            value={row.value || ""}
            placeholder={translateKey(`${locale}.value`) || "Value"}
            onChange={(event) => updateRow(index, { value: event.target.value })}
          />
          {multiple && (
            <button
              type="button"
              aria-label={translateKey(`${locale}.remove`) || "Remove"}
              onClick={() => removeRow(index)}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {multiple && (
        <button
          type="button"
          className="dcf-button clear"
          onClick={addRow}
        >
          + {translateKey(`${locale}.add`) || "Add filter"}
        </button>
      )}

      {!disableSort && (
        <div className="dcf-filter-sort">
          <select
            aria-label={translateKey(`${locale}.sort`) || "Sort"}
            value={sort.value}
            onChange={(event) => updateSort({ value: event.target.value })}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label={translateKey(`${locale}.direction`) || "Direction"}
            value={sort.direction}
            onChange={(event) =>
              updateSort({ direction: event.target.value as OrderDirection })
            }
          >
            <option value={OrderDirection.ASC}>Ascending</option>
            <option value={OrderDirection.DSC}>Descending</option>
          </select>
        </div>
      )}

      <div className="dcf-buttons-container">
        <button type="button" className="dcf-button clear" onClick={clear}>
          {translateKey(`${locale}.clear`) || "Clear"}
        </button>
      </div>
    </div>
  );
};
