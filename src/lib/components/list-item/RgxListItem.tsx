import React, { useMemo } from "react";
import { OperationKeys, CrudOperations } from "@decaf-ts/db-decorators";
import { ComponentEventNames } from "../../engine/constants.js";
import { ListItemCustomEvent } from "../../engine/interfaces.js";
import { KeyValue } from "../../engine/types.js";
import { itemMapper, windowEventEmitter } from "../../utils/helpers.js";
import { RgxIcon } from "../icon/RgxIcon.js";

/**
 * @description Public props accepted by the {@link RgxListItem} component.
 * @summary Configures the item payload, the optional mapper used to reshape it,
 * the icon and action layout, and the callback invoked when a CRUD action is
 * emitted. Text slots fall back to the matching keys found on the item when no
 * explicit value is supplied.
 * @memberOf module:for-react
 */
export interface RgxListItemProps {
  item?: KeyValue | Record<string, unknown>;
  option?: { title: string; description?: string };
  actionsType?: "popover" | "inline";
  lines?: "inset" | "full" | "none";
  icon?: string;
  iconSlot?: "start" | "end";
  button?: boolean;
  title?: string;
  description?: string;
  info?: string;
  subinfo?: string;
  mapper?: Record<string, string> | ((item: KeyValue) => KeyValue);
  operations?: CrudOperations[];
  emitEvent?: boolean;
  pk?: string;
  className?: string;
  onClickEvent?: (event: ListItemCustomEvent) => void;
}

function resolveValue(source: KeyValue, prop?: string): string | undefined {
  if (!prop) return undefined;
  const value = source?.[prop];
  if (typeof value === "undefined") return undefined;
  return String(value);
}

/**
 * @description Compact list row that renders an item's title, description and
 * related information with an optional icon and CRUD action icons.
 * @summary Resolves display values from explicit props, a mapper function or a
 * key-mapping object, then renders them in a `button` element unless `button`
 * is `false`, in which case a plain `div` is used. When operations are supplied
 * it shows eye/edit/trash icons and emits a `ListItemClickEvent` through the
 * window event emitter, forwarding the same payload to `onClickEvent`. Clicking
 * the row itself emits a READ action carrying the resolved primary key.
 * @param {RgxListItemProps} props - Values that control the rendered item and
 * the events it emits.
 * @returns {React.ReactElement} The rendered list item container.
 * @memberOf module:for-react
 */
export const RgxListItem: React.FC<RgxListItemProps> = ({
  item = {},
  option,
  actionsType = "inline",
  lines = "full",
  icon,
  iconSlot = "start",
  button = true,
  title,
  description,
  info,
  subinfo,
  mapper,
  operations = [],
  emitEvent = false,
  pk = "id",
  className = "",
  onClickEvent,
}) => {
  const parsed = useMemo<KeyValue>(() => {
    if (option?.title) {
      return {
        title: option.title,
        description: option.description,
        ...item,
      };
    }
    const source = item as KeyValue;
    let mapped: KeyValue = { ...source };
    if (typeof mapper === "function") {
      mapped = { ...source, ...mapper(source) };
    } else if (mapper && Object.keys(mapper).length) {
      mapped = itemMapper(source, mapper as KeyValue);
    }
    return {
      title: title || resolveValue(mapped, "title") || resolveValue(source, "title"),
      description:
        description ||
        resolveValue(mapped, "description") ||
        resolveValue(source, "description"),
      info: info || resolveValue(mapped, "info") || resolveValue(source, "info"),
      subinfo:
        subinfo || resolveValue(mapped, "subinfo") || resolveValue(source, "subinfo"),
      ...mapped,
    };
  }, [item, option, mapper, title, description, info, subinfo]);

  const uid =
    (option ? (item as KeyValue)?.value : (item as KeyValue)?.[pk]) ??
    (item as KeyValue)?.uid;

  const emit = (action: CrudOperations, event?: React.MouseEvent) => {
    const payload: ListItemCustomEvent = {
      name: ComponentEventNames.CLICK,
      action: action as string,
      pk,
      data: uid,
      component: "ListItemComponent",
      target: event?.target as EventTarget | null,
    };
    windowEventEmitter(`ListItem${ComponentEventNames.CLICK}`, payload);
    onClickEvent?.(payload);
  };

  const body = (
    <>
      {icon && iconSlot === "start" && <RgxIcon name={icon} />}
      <div className="dcf-list-item-content">
        {!!parsed.title && (
          <div className="dcf-title">{String(parsed.title)}</div>
        )}
        {!!parsed.description && (
          <div className="dcf-subtitle">{String(parsed.description)}</div>
        )}
        {!!parsed.info && (
          <div className="dcf-info">{String(parsed.info)}</div>
        )}
        {!!parsed.subinfo && (
          <div className="dcf-subinfo">{String(parsed.subinfo)}</div>
        )}
      </div>
      {icon && iconSlot === "end" && <RgxIcon name={icon} />}
      {!!operations.length && (
        <div className={`dcf-list-item-actions ${actionsType}`}>
          {operations.includes(OperationKeys.READ) && (
            <RgxIcon
              name="ti-eye"
              button
              onClick={() => emit(OperationKeys.READ)}
            />
          )}
          {operations.includes(OperationKeys.UPDATE) && (
            <RgxIcon
              name="ti-edit"
              button
              onClick={() => emit(OperationKeys.UPDATE)}
            />
          )}
          {operations.includes(OperationKeys.DELETE) && (
            <RgxIcon
              name="ti-trash"
              button
              onClick={() => emit(OperationKeys.DELETE)}
            />
          )}
        </div>
      )}
    </>
  );

  const classes = [
    "dcf-list-item",
    `dcf-lines-${lines}`,
    operations.length ? "action" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!button) {
    return <div className={classes}>{body}</div>;
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={(event) => {
        if (emitEvent || operations.length) {
          emit(OperationKeys.READ, event);
        } else {
          emit(OperationKeys.READ, event);
        }
      }}
    >
      {body}
    </button>
  );
};
