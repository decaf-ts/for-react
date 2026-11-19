import React, { useCallback, useState } from "react";
import type {
  ScrumSprint,
  SprintSelectionEvent,
} from "./scrum.types.js";

let nextSprintSelectorInstance = 0;

/**
 * @description Props accepted by {@link SprintSelector}.
 * @summary Fully controlled sprint picker: `sprints` supplies the options and
 * `selectedSprintId` supplies the current value; the component never stores a
 * selection or changes sprint lifecycle. All labels are plain strings with
 * English defaults, so i18n is resolved by the host page. While `loading` or
 * `disabled` the select cannot change, and `loading`/empty-list notices are
 * exposed through a polite status region referenced by `aria-describedby`.
 * @interface SprintSelectorProps
 * @property {ScrumSprint[]} [sprints=[]] - Sprints to offer, in display order;
 * an empty list renders the "no sprints" notice.
 * @property {string | null} [selectedSprintId=null] - Controlled selected sprint
 * id; `null` selects the placeholder.
 * @property {string} [label="Sprint"] - Accessible label bound to the select.
 * @property {string} [placeholder="Select a sprint"] - Value of the empty first
 * option.
 * @property {boolean} [disabled=false] - Disables the select.
 * @property {boolean} [loading=false] - Disables the select, sets `aria-busy`
 * and renders the loading notice.
 * @property {string} [instanceId=""] - Stable id prefix for the select and
 * status region; generated when empty.
 * @property {function(SprintSelectionEvent): void} [onSprintSelected] - Emitted
 * with the chosen sprint id, or `null` for the placeholder; the select is
 * reverted to `selectedSprintId` before the callback runs.
 * @memberOf module:for-react.scrum
 */
export interface SprintSelectorProps {
  sprints?: readonly ScrumSprint[];
  selectedSprintId?: string | null;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  instanceId?: string;
  onSprintSelected?: (event: SprintSelectionEvent) => void;
}

/**
 * @description Controlled, emit-only sprint picker.
 * @summary Renders a labelled `select` from the host's sprint list and reports a
 * choice through `onSprintSelected` instead of applying it; the host stores the
 * selection and re-supplies `selectedSprintId`. The component never mutates a
 * sprint and owns no lifecycle state. It reverts the native select to
 * `selectedSprintId` before emitting, so a parent that ignores the event never
 * shows an unconfirmed selection.
 * @param {SprintSelectorProps} props - Controlled selector props.
 * @returns {React.ReactElement} The rendered selector region.
 * @memberOf module:for-react.scrum
 */
export function SprintSelector(
  props: SprintSelectorProps
): React.ReactElement {
  const {
    sprints = [],
    selectedSprintId = null,
    label = "Sprint",
    placeholder = "Select a sprint",
    disabled = false,
    loading = false,
    instanceId = "",
    onSprintSelected,
  } = props;

  const [generatedInstanceId] = useState(
    () => `decaf-sprint-selector-${++nextSprintSelectorInstance}`
  );
  const resolvedInstanceId = instanceId || generatedInstanceId;
  const selectId = `${resolvedInstanceId}-select`;
  const statusId = `${resolvedInstanceId}-status`;
  const isDisabled = disabled || loading;
  const describe = loading || !sprints.length ? statusId : undefined;

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const select = event.target;
      const value = select.value ?? "";
      select.value = selectedSprintId ?? "";
      onSprintSelected?.({ sprintId: value || null });
    },
    [onSprintSelected, selectedSprintId]
  );

  return (
    <div className="dcf-sprint-selector-host">
      <div className="dcf-sprint-selector">
        <label className="dcf-sprint-selector__label" htmlFor={selectId}>
          {label}
        </label>
        <select
          className="dcf-sprint-selector__select"
          id={selectId}
          disabled={isDisabled}
          aria-busy={loading}
          aria-describedby={describe}
          value={selectedSprintId ?? ""}
          onChange={onChange}
        >
          <option value="">{placeholder}</option>
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.title}
            </option>
          ))}
        </select>
        {loading ? (
          <span
            className="dcf-sprint-selector__status"
            id={statusId}
            role="status"
            aria-live="polite"
          >
            Loading sprints...
          </span>
        ) : !sprints.length ? (
          <span
            className="dcf-sprint-selector__status"
            id={statusId}
            role="status"
          >
            No sprints available.
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @description Alias of {@link SprintSelector} kept for callers porting Angular
 * component names to the React package.
 * @summary Behaves exactly like {@link SprintSelector}; it is a naming bridge
 * with no separate implementation.
 * @constant
 * @type {function}
 * @memberOf module:for-react.scrum
 */
export const SprintSelectorComponent = SprintSelector;
