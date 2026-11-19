import React, { useMemo, useState } from "react";
import { CrudOperations, OperationKeys } from "@decaf-ts/db-decorators";
import { escapeHtml } from "@decaf-ts/ui-decorators";
import { KeyValue } from "../../engine/types.js";
import { IBaseCustomEvent } from "../../engine/interfaces.js";
import { ComponentEventNames } from "../../engine/constants.js";
import { RgxSearchbar } from "../searchbar/RgxSearchbar.js";
import { RgxEmptyState } from "../empty-state/RgxEmptyState.js";
import { RgxPagination } from "../pagination/RgxPagination.js";
import { RgxTooltip } from "../../directives/RgxTooltip.js";
import { translateKey } from "../../services/RgxTranslateService.js";
import { windowEventEmitter } from "../../utils/helpers.js";

/**
 * @description Public props accepted by the {@link RgxTable} component.
 * @summary Provides the row data, the available CRUD operations, search and
 * filter configuration, pagination size, column content limits and the
 * callbacks fired for search, filter, actions and pagination.
 * @memberOf module:for-react
 */
export interface RgxTableProps {
  data?: KeyValue[];
  operations?: CrudOperations[];
  allowOperations?: boolean;
  maxContentLength?: number;
  preserve?: string[];
  showSearchbar?: boolean;
  showFilter?: boolean;
  filterValue?: string;
  filterOptions?: { label: string; value: string }[];
  filterLabel?: string;
  searchableKeys?: string | string[];
  pageSize?: number;
  modelName?: string;
  className?: string;
  locale?: string;
  onSearch?: (value: string) => void;
  onFilter?: (value: string) => void;
  onAction?: (event: IBaseCustomEvent) => void;
  onPaginate?: (page: number) => void;
}

const hiddenColumns = ["handler", "actions", "uid"];

function cellValue(row: KeyValue, key: string): string {
  const value = row?.[key];
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.join(", ");
    const record = value as KeyValue;
    if ("value" in record) return String(record.value);
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * @description Tabular view of a list of records with optional search, filter,
 * action column and pagination.
 * @summary Derives columns from the keys of the first row, excluding the
 * internal `handler`, `actions` and `uid` keys. Search filters rows
 * case-insensitively across `searchableKeys` and resets to the first page, as
 * does changing the filter. Values that are objects are flattened: arrays are
 * joined, records with a `value` field render that value, and other objects are
 * JSON-stringified. When `maxContentLength` is positive, cells outside
 * `preserve` are truncated through {@link RgxTooltip}. Action buttons are shown
 * when `allowOperations` is true and the matching operations are present,
 * emitting a window `listItemClickEvent` and calling `onAction`. Empty results
 * render a {@link RgxEmptyState} and all views are paginated by `pageSize`.
 * @param {RgxTableProps} props - Values that control the rows and behaviour.
 * @returns {React.ReactElement} The rendered table with its controls.
 * @memberOf module:for-react
 */
export const RgxTable: React.FC<RgxTableProps> = ({
  data = [],
  operations = [],
  allowOperations = true,
  maxContentLength = -1,
  preserve = ["userId"],
  showSearchbar = true,
  showFilter = false,
  filterValue = "",
  filterOptions = [],
  filterLabel = "Filter",
  searchableKeys = "name",
  pageSize = 10,
  modelName,
  className = "",
  locale = "table",
  onSearch,
  onFilter,
  onAction,
  onPaginate,
}) => {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(filterValue);
  const [page, setPage] = useState(1);

  const keys = Array.isArray(searchableKeys)
    ? searchableKeys
    : [searchableKeys || "name"];

  const filtered = useMemo(() => {
    if (!search) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      keys.some((key) => cellValue(row, key).toLowerCase().includes(term))
    );
  }, [data, search, keys]);

  const columns = useMemo(() => {
    const source = data[0] || {};
    return Object.keys(source).filter((key) => !hiddenColumns.includes(key));
  }, [data]);

  const headers = useMemo(() => {
    if (!filterValue) return columns;
    return columns;
  }, [columns, filterValue]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const emitAction = (
    action: CrudOperations,
    row: KeyValue,
    event?: React.MouseEvent
  ) => {
    const payload: IBaseCustomEvent = {
      name: ComponentEventNames.CLICK,
      component: "TableComponent",
      data: {
        action,
        pk: row["uid"] ?? row["id"],
        model: modelName,
      },
      target: event?.target as EventTarget | null,
    };
    windowEventEmitter("listItemClickEvent", payload);
    onAction?.(payload);
  };

  const showActions =
    allowOperations &&
    (operations.includes(OperationKeys.UPDATE) ||
      operations.includes(OperationKeys.READ) ||
      operations.includes(OperationKeys.DELETE));

  return (
    <div className={["dcf-table", className].filter(Boolean).join(" ")}>
      {(showSearchbar || showFilter) && (
        <div className="dcf-grid-actions">
          {showSearchbar && (
            <RgxSearchbar
              placeholder={translateKey(`${locale}.search`) || "Search"}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
                onSearch?.(value);
              }}
            />
          )}
          {showFilter && (
            <select
              aria-label={filterLabel}
              value={selectedFilter}
              onChange={(event) => {
                setSelectedFilter(event.target.value);
                setPage(1);
                onFilter?.(event.target.value);
              }}
            >
              <option value="">{translateKey(`${locale}.filter.all`) || "All"}</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {visible.length ? (
        <table className="dcf-table" aria-label={modelName}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {translateKey(`${locale}.${header}.label`) || header}
                </th>
              ))}
              {showActions && <th scope="col">{translateKey(`${locale}.actions.label`) || "Actions"}</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={String(row["uid"] ?? row["id"] ?? index)}>
                {headers.map((header) => {
                  const value = cellValue(row, header);
                  const truncate =
                    maxContentLength > 0 && !preserve.includes(header);
                  return (
                    <td key={header}>
                      {truncate ? (
                        <RgxTooltip
                          options={{
                            text: value,
                            truncate: true,
                            limit: maxContentLength,
                          }}
                        />
                      ) : (
                        <span>{value}</span>
                      )}
                    </td>
                  );
                })}
                {showActions && (
                  <td className="dcf-col-actions">
                    {operations.includes(OperationKeys.UPDATE) && (
                      <button
                        type="button"
                        aria-label={translateKey(`${locale}.operations.update`) || "Update"}
                        onClick={(event) => emitAction(OperationKeys.UPDATE, row, event)}
                      >
                        Edit
                      </button>
                    )}
                    {operations.includes(OperationKeys.DELETE) && (
                      <button
                        type="button"
                        aria-label={translateKey(`${locale}.operations.delete`) || "Delete"}
                        onClick={(event) => emitAction(OperationKeys.DELETE, row, event)}
                      >
                        Delete
                      </button>
                    )}
                    {!operations.includes(OperationKeys.UPDATE) &&
                      operations.includes(OperationKeys.READ) &&
                      !operations.includes(OperationKeys.DELETE) && (
                        <button
                          type="button"
                          aria-label={translateKey(`${locale}.operations.read`) || "Read"}
                          onClick={(event) => emitAction(OperationKeys.READ, row, event)}
                        >
                          View
                        </button>
                      )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <RgxEmptyState
          title={
            search
              ? translateKey("component.list.search.title") || "No results found"
              : translateKey("component.list.empty.title") || "No data"
          }
          subtitle={
            search
              ? translateKey("component.list.search.subtitle", { "0": escapeHtml(search) }) ||
                `No results for "${escapeHtml(search)}"`
              : translateKey("component.list.empty.subtitle") || ""
          }
          icon={search ? "ti-search" : "ti-folder-open"}
        />
      )}

      <div className="dcf-table-pagination">
        <RgxPagination
          totalPages={totalPages}
          current={page}
          onChange={(event) => {
            setPage(event.data.page);
            onPaginate?.(event.data.page);
          }}
        />
      </div>
    </div>
  );
};
