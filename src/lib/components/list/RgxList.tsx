import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CrudOperations } from "@decaf-ts/db-decorators";
import { escapeHtml } from "@decaf-ts/ui-decorators";
import {
  IBaseCustomEvent,
  IFilterQuery,
  IListComponentRefreshEvent,
  IListEmptyOptions,
  IPaginationCustomEvent,
  ListItemCustomEvent,
} from "../../engine/interfaces.js";
import { DefaultListEmptyOptions, ListComponentsTypes } from "../../engine/constants.js";
import { KeyValue } from "../../engine/types.js";
import { RgxEmptyState } from "../empty-state/RgxEmptyState.js";
import { RgxPagination } from "../pagination/RgxPagination.js";
import { RgxSearchbar } from "../searchbar/RgxSearchbar.js";
import { RgxSearchbarProps } from "../searchbar/RgxSearchbar.js";
import { RgxFilter } from "../filter/RgxFilter.js";
import { RgxListItem } from "../list-item/RgxListItem.js";
import { translateKey } from "../../services/RgxTranslateService.js";
import { windowEventEmitter } from "../../utils/helpers.js";

/**
 * @description Public props accepted by the {@link RgxList} component.
 * @summary Configures the list's data source, presentation mode, search and
 * filter behaviour, pagination, empty state, item rendering, operation actions
 * and the callbacks fired for user interactions. When `customSource` is true
 * the supplied `data` is rendered as-is and client-side search and filtering
 * are skipped.
 * @memberOf module:for-react
 */
export interface RgxListProps {
  type?: ListComponentsTypes | "infinite" | "paginated";
  data?: KeyValue[];
  model?: unknown;
  modelName?: string;
  operations?: CrudOperations[];
  showSearchbar?: boolean;
  searchbarPlaceholder?: string;
  searchableKeys?: string | string[];
  loadMoreData?: boolean;
  lines?: "inset" | "full" | "none";
  inset?: boolean;
  loadingText?: string;
  showRefresher?: boolean;
  createButton?: boolean;
  enableFilter?: boolean;
  multipleFilter?: boolean;
  disableSort?: boolean;
  disablePaginationPages?: boolean;
  truncatePaginationPages?: boolean;
  empty?: Partial<IListEmptyOptions>;
  customSource?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  loading?: boolean;
  mapper?: Record<string, string>;
  className?: string;
  locale?: string;
  itemIcon?: string;
  sortOptions?: { label: string; value: string }[];
  onSearch?: (value: string) => void;
  onFilter?: (query: IFilterQuery | undefined) => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  onLoadMore?: () => void;
  onPaginate?: (page: number) => void;
  onItemClick?: (event: ListItemCustomEvent | IBaseCustomEvent) => void;
  renderItem?: (item: KeyValue, index: number) => React.ReactNode;
  searchbarProps?: Partial<RgxSearchbarProps>;
}

function matchesSearch(item: KeyValue, search: string, keys: string[]): boolean {
  if (!search) return true;
  const term = search.toLowerCase();
  return keys.some((key) => {
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") {
        return (acc as KeyValue)[part];
      }
      return undefined;
    }, item);
    return String(value ?? "").toLowerCase().includes(term);
  });
}

/**
 * @description Data list with search, filtering, pagination and empty states.
 * @summary Filters `data` by the search term across `searchableKeys` (supporting
 * dotted paths) and by the query emitted from the filter bar, unless
 * `customSource` is set. Paginated mode slices the filtered results by
 * `pageSize`, deriving the page count from the data when `totalPages` is not
 * provided; non-paginated mode renders everything and shows a load-more button
 * when `loadMoreData` and `onLoadMore` are supplied. Items render through
 * `renderItem` when given, otherwise through {@link RgxListItem}. Item clicks
 * emit a `listItemClickEvent` window event before invoking `onItemClick`, and
 * the refresh action emits a `RefreshEvent` alongside `onRefresh`. An empty or
 * search-miss result shows a {@link RgxEmptyState}, and the pagination control
 * is rendered only in paginated mode.
 * @param {RgxListProps} props - Component properties.
 * @returns {React.ReactElement} The rendered list container.
 * @memberOf module:for-react
 */
export const RgxList: React.FC<RgxListProps> = ({
  type = ListComponentsTypes.PAGINATED,
  data = [],
  model,
  modelName,
  operations = [],
  showSearchbar = true,
  searchbarPlaceholder = "Search",
  searchableKeys = "name",
  loadMoreData = true,
  lines = "full",
  inset = false,
  loadingText,
  showRefresher = true,
  createButton = false,
  enableFilter = true,
  multipleFilter = true,
  disableSort = false,
  disablePaginationPages = false,
  truncatePaginationPages = true,
  empty = {},
  customSource = false,
  pageSize = 10,
  currentPage = 1,
  totalPages,
  loading = false,
  mapper,
  className = "",
  locale = "list",
  itemIcon,
  sortOptions = [],
  onSearch,
  onFilter,
  onRefresh,
  onCreate,
  onLoadMore,
  onPaginate,
  onItemClick,
  renderItem,
  searchbarProps,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<IFilterQuery | undefined>();
  const [page, setPage] = useState(currentPage);

  useEffect(() => {
    setPage(currentPage);
  }, [currentPage]);

  const keys = useMemo(
    () =>
      Array.isArray(searchableKeys)
        ? searchableKeys
        : [searchableKeys || "name"],
    [searchableKeys]
  );

  const filtered = useMemo(() => {
    if (customSource) return data;
    let result = data.filter((item) => matchesSearch(item, search, keys));
    if (filter?.query?.length) {
      result = result.filter((item) =>
        filter.query!.every((clause) => {
          if (!clause.index) return true;
          const value = String(item[clause.index] ?? "");
          const target = String(clause.value ?? "");
          switch (clause.condition) {
            case "Contains":
              return value.includes(target);
            case "Not Contains":
              return !value.includes(target);
            case "Not Equal":
              return value !== target;
            case "Greater Than":
              return Number(value) > Number(target);
            case "Less Than":
              return Number(value) < Number(target);
            default:
              return value === target;
          }
        })
      );
    }
    return result;
  }, [data, search, keys, customSource, filter]);

  const paginated = type === ListComponentsTypes.PAGINATED;
  const resolvedTotalPages =
    totalPages ?? Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = paginated
    ? filtered.slice((page - 1) * pageSize, page * pageSize)
    : filtered;

  const handleItemClick = useCallback(
    (event: ListItemCustomEvent) => {
      const payload: ListItemCustomEvent = {
        name: event.name,
        action: event.action,
        pk: event.pk,
        data: event.data,
        component: "ListComponent",
      };
      windowEventEmitter("listItemClickEvent", payload);
      onItemClick?.(event);
    },
    [onItemClick]
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    onSearch?.(value);
  };

  const handlePage = (event: IPaginationCustomEvent) => {
    setPage(event.data.page);
    onPaginate?.(event.data.page);
  };

  const emptyOptions: IListEmptyOptions = {
    ...DefaultListEmptyOptions,
    ...empty,
  } as IListEmptyOptions;

  const refreshEvent: IListComponentRefreshEvent = { data: filtered };

  return (
    <div
      className={["dcf-list", className].filter(Boolean).join(" ")}
      data-model={typeof model === "string" ? model : undefined}
      aria-label={modelName}
    >
      {(showSearchbar || enableFilter || createButton) && (
        <div className="dcf-list-actions">
          {showSearchbar && (
            <RgxSearchbar
              placeholder={
                searchbarPlaceholder ||
                translateKey(`${locale}.search`) ||
                "Search"
              }
              debounce={searchbarProps?.debounce ?? 500}
              showCancelButton={searchbarProps?.showCancelButton ?? "never"}
              showClearButton={searchbarProps?.showClearButton ?? "focus"}
              onSearch={handleSearch}
              onCancel={() => handleSearch("")}
              {...searchbarProps}
            />
          )}
          {enableFilter && (
            <RgxFilter
              multiple={multipleFilter}
              disableSort={disableSort}
              sortOptions={sortOptions}
              onFilter={(query) => {
                setFilter(query);
                onFilter?.(query);
              }}
            />
          )}
          {createButton && (
            <button
              type="button"
              className="dcf-button primary"
              onClick={onCreate}
            >
              + {translateKey(`${locale}.create`) || "Create"}
            </button>
          )}
        </div>
      )}

      <div className="dcf-list-content" data-inset={inset}>
        {loading ? (
          <div role="status" aria-busy="true">
            {loadingText || translateKey("component.loading") || "Loading..."}
          </div>
        ) : filtered.length ? (
          <div className="dcf-list-items">
            {visible.map((item, index) => (
              <div key={String(item[pkFromItem(item)] ?? index)}>
                {renderItem ? (
                  renderItem(item, index)
                ) : (
                  <RgxListItem
                    item={item}
                    mapper={mapper}
                    icon={itemIcon}
                    lines={lines}
                    operations={operations}
                    onClickEvent={handleItemClick}
                  />
                )}
              </div>
            ))}
            {!paginated && loadMoreData && onLoadMore && (
              <button
                type="button"
                className="dcf-button clear"
                onClick={onLoadMore}
              >
                {translateKey(`${locale}.load_more`) || "Load more"}
              </button>
            )}
          </div>
        ) : (
          <RgxEmptyState
            title={
              search
                ? translateKey("component.list.search.title") ||
                  "No results found"
                : translateKey("component.list.empty.title") ||
                  emptyOptions.title
            }
            subtitle={
              search
                ? translateKey("component.list.search.subtitle", { "0": escapeHtml(search) }) ||
                  `No results for "${escapeHtml(search)}"`
                : translateKey("component.list.empty.subtitle") ||
                  emptyOptions.subtitle
            }
            icon={search ? "ti-search" : itemIcon || emptyOptions.icon}
            showIcon
            buttonText={emptyOptions.buttonText}
            buttonLink={emptyOptions.link || undefined}
            onButtonClick={onCreate}
            className="dcf-empty-data"
          />
        )}
      </div>

      {paginated ? (
        <div className="dcf-list-pagination">
          <RgxPagination
            totalPages={resolvedTotalPages}
            current={page}
            disablePages={disablePaginationPages}
            truncatePages={truncatePaginationPages}
            onChange={handlePage}
          />
        </div>
      ) : null}

      {showRefresher && (
        <button
          type="button"
          className="dcf-button clear dcf-refresher"
          onClick={() => {
            onRefresh?.();
            windowEventEmitter("RefreshEvent", refreshEvent);
          }}
        >
          {translateKey(`${locale}.refresh`) || "Refresh"}
        </button>
      )}

    </div>
  );
};

function pkFromItem(item: KeyValue): string {
  return (item["uid"] as string) || (item["id"] as string) || "id";
}
