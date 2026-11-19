# `@decaf-ts/for-react/math`

LaTeX input field wrapping the MathLive `<math-field>` custom element, exposed
as the `./math` subpath export of `@decaf-ts/for-react`. MathLive is loaded
lazily from this entry point, so the root bundle never imports it.

## Install

```bash
npm install @decaf-ts/for-react mathlive@^0.111.1
```

`mathlive` is an **optional peer dependency** of `@decaf-ts/for-react`. Install
it only in applications that import `/math`. If the dynamic import fails (for
example in a non-browser environment), the field stays inert instead of
throwing.

### Compatibility

| Package | Tested range |
| --- | --- |
| `react` / `react-dom` | `>=18.0.0` |
| `mathlive` | `^0.111.1` (optional peer) |
| `@decaf-ts/for-react` | `0.0.x` |

MathLive is MIT-licensed; see the package `LICENSE.txt`.

## Controlled-view contract

`MathInput` is a form control surface with no persistence and no validation
policy of its own.

- `value` is the controlled LaTeX string. Writing a new value updates the
  field; typing in the field reports the new value through `onChange` (and the
  `onValueChange` alias). Feed that value back through `value` to keep the
  component controlled.
- Writes are guarded: when the incoming `value` already matches the field
  content the component skips the assignment, so the cursor and selection are
  not clobbered.
- `disabled` renders the field read-only; the component never derives disabled
  state from surrounding forms.
- There is no output other than the change callbacks. Service calls, validation
  and submission belong to the host.

## Usage

```tsx
import { useState } from "react";
import { MathInput } from "@decaf-ts/for-react/math";

export function FormulaField() {
  const [latex, setLatex] = useState("\\frac{a}{b}");

  return (
    <label>
      <span>Formula</span>
      <MathInput
        value={latex}
        placeholder="\\frac{a}{b}"
        onChange={setLatex}
      />
    </label>
  );
}
```

### API

| Member | Type | Default | Purpose |
| --- | --- | --- | --- |
| `value` | `string` | `''` | LaTeX content of the field. |
| `placeholder` | `string` | `''` | Placeholder text when empty. |
| `disabled` | `boolean` | `false` | Render but reject edits. |
| `onChange` | `(value: string) => void` | — | Reports the LaTeX value after each edit. |
| `onValueChange` | `(value: string) => void` | — | Alias of `onChange`; both fire together. |
| `className` | `string` | — | Extra classes appended to the field element; the base class `decaf-math-input__field` is always present. |
| `style` | `React.CSSProperties` | — | Inline styles merged onto the field defaults. |

`MathInputComponent` and `RgxMathInput` are exported as aliases of `MathInput`
for callers porting Angular component names or following the `Rgx*` naming
convention of the main package.

The public API is structural only: no MathLive type is exported or re-exported.
The MathLive `<math-field>` interaction is typed through an internal
`MathfieldElementLike` shape (`value`, `placeholder`, `readOnly`,
`mathVirtualKeyboardPolicy`).

## Loading and SSR

- MathLive is imported with a dynamic `import('mathlive')` after the component
  mounts, at most once per component lifetime. The promise is memoized and
  released on unmount.
- A failed import is swallowed: the field stays inert and the component never
  throws. This covers server rendering, non-browser runtimes and installs that
  omitted the optional peer.
- Server rendering emits the empty `<math-field>` host. No import-time code
  touches `window` or `document`, and no MathLive bundle is evaluated during
  server rendering.
- MathLive's package export map resolves the `node` condition to an
  import-only SSR bundle, so CommonJS hosts resolve the lazy load through the
  browser/default `require` condition and Node falls back to the inert path.

## Accessibility

- The underlying MathLive field provides its own keyboard editing, math
  semantics and virtual keyboard. The component pins
  `mathVirtualKeyboardPolicy` to `'manual'` so the on-screen keyboard never
  steals focus unexpectedly.
- The host supplies a visible label or description, as with any form field.
  Wrap the component in a `<label>` (as in the example above) or associate it
  with `aria-labelledby` / `aria-describedby` from the surrounding markup.

## License

MathLive is MIT-licensed. It is an external optional peer and is not vendored.
