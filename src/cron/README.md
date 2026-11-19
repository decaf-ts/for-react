# `@decaf-ts/for-react/cron`

Cron-expression authoring surfaces: the standalone `<CronSelector>` component,
the five-field `<CronBuilder>`, and the `<CronSelectorField>` CRUD adapter
built on the for-react form-provider contract.

The entry point owns the only feature-specific runtime dependency,
`cronstrue` (imported as `cronstrue/i18n.js` for locale-aware descriptions). It is
an optional peer, so a core-only installation never installs it. Ionic React is
also an optional peer, matching the Angular `@ionic/angular` surface.

## Install

```bash
npm install @decaf-ts/for-react cronstrue@^3 @ionic/react@^9
```

`cronstrue` and `@ionic/react` are **optional peer dependencies** of
`@decaf-ts/for-react`. Install them only in applications that import `/cron`.
The entry point also uses the required root peers: `react`, `react-dom`,
`@decaf-ts/db-decorators`, and the shared for-react i18n services.

### Compatibility

| Package | Tested range |
| --- | --- |
| `react` / `react-dom` | `>=18.0.0` |
| `@ionic/react` | `^9` (optional peer) |
| `cronstrue` | `^3` (optional peer) |
| `@decaf-ts/for-react` | `0.0.x` |

`cronstrue` and Ionic are MIT-licensed. See the package `NOTICE`.

## Usage

```tsx
import { useState } from "react";
import { CronSelector } from "@decaf-ts/for-react/cron";

export function ScheduleEditor() {
  const [cron, setCron] = useState("0 9 * * *");

  return (
    <>
      <CronSelector
        value={cron}
        describeCron={true}
        onChange={setCron}
        onValueChange={setCron}
      />
      <output>{cron}</output>
    </>
  );
}
```

### CronSelector API

| Member | Type | Default | Purpose |
| --- | --- | --- | --- |
| `value` | `string` | `'0 9 * * *'` | Controlled cron expression. |
| `defaultValue` | `string` | — | Initial expression when `value` is omitted. |
| `onChange` / `onValueChange` | `(value: string) => void` | — | Reports the published expression after every schedule edit. |
| `describeCron` | `boolean` | `true` | Render a human-readable `cronstrue` description. |
| `hideDaily` / `hideInterval` / `hideWeekly` | `boolean` | `false` | Hide schedule modes. |
| `disabled` | `boolean` | `false` | Disable the selector; the last published expression is kept. |
| `formControl` | `{ setValue(value, options?) }` | — | Optional external form-control sync equivalent to the Angular `FormControl` binding. |

The selector keeps `{ mode, time, times, everyHours, weekdays }` with defaults
`daily / '09:00' / ['09:00'] / 8 / [1..5]`. Hourly schedules serialize to
`0 */N * * *`; weekly schedules join the selected weekday numbers (or `*`);
daily and weekly times sort by hour then minute and collapse to one expression
when every slot shares the same minute. Invalid times raise `InternalError`.
Daily and weekly time slots use a real `IonDatetime` behind `IonDatetimeButton`,
so the time picker is editable (the Angular source only rendered the button).

### CronBuilder API

| Member | Type | Default | Purpose |
| --- | --- | --- | --- |
| `value` | `string` | `'0 9 * * *'` | Controlled built expression. |
| `cron` | `string` | `'0 9 * * *'` | Seed expression when `value` is omitted. |
| `onChange` / `onValueChange` / `changeEvent` | `(value: string) => void` | — | Reports the built expression after every change. |
| `fields` | `('minute' \| 'hour' \| 'day' \| 'month' \| 'weekday')[]` | all five | Fields exposed by the builder. |
| `multiple` | `boolean` | `false` | Accumulate several `;`-separated expressions. |
| `describeCron` | `boolean` | `true` | Render the localized description. |
| `label` | `string` | `''` | i18n label rendered above the builder. |
| `isReadOnlyOperation` | `boolean` | `false` | Render the value read-only. |
| `disabled` | `boolean` | `false` | Disable editing; the last built expression is kept. |
| `hideDaily` / `hideInterval` / `hideWeekly` | `boolean` | `false` | Hide the matching quick presets. |

The builder supports per-field "every N" interval toggles (`*/N` parsing with a
`0` fallback for `*`), presets (every N minutes/hours, daily at hour,
weekdays, monthly), copy-to-clipboard, and `multiple` accumulation joining
expressions with `;`.

### CronSelectorField (CRUD adapter)

`<CronSelectorField>` accepts the for-react `ControlFieldProps` contract
(`name`, `path`, `label`, `required`, `readonly`, `disabled`, `operation`,
`formProvider`) plus:

| Member | Type | Default | Purpose |
| --- | --- | --- | --- |
| `allowEmpty` | `boolean` | `false` | Adds a checkbox that clears the value when unchecked. |
| `describeCron` | `boolean` | `false` | Forwarded to the builder. |
| `multiple` | `boolean` | `true` | Forwarded to the builder. |
| `hideDaily` / `hideInterval` / `hideWeekly` | `boolean` | `false` | Forwarded to the builder. |

Empty values fall back to `defaultCron` (`'0 9 * * *'`). Required, non-empty
fields force the selector open, and read-only operations suppress value writes.

Register the cron tags with the rendering engine when a model-driven CRUD form
should resolve them:

```ts
import { registerCronComponents } from "@decaf-ts/for-react/cron";

registerCronComponents();
```

That registers `ngx-decaf-cron-selector`, `ngx-decaf-cron-builder`,
`ngx-decaf-cron-selector-field`, and `app-cron-selector-field`.

## Styles

The adapter ships a bundled stylesheet:

```ts
import "@ionic/react/css/core.css";
import "@decaf-ts/for-react/cron/styles.css";
```

## i18n

The `component.cron_selector`, `component.cron_builder`, `cron_selector`, and
`date` dictionaries ship with the package's English and Portuguese resources.
Descriptions re-render when the active language changes; `pt*` maps to
`pt_BR`, `en*` maps to `en`, and other locales replace `-` with `_`.

## License

`cronstrue` and Ionic are external optional peers and are not vendored.
