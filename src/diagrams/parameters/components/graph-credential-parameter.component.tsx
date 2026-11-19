import type { GraphCredentialReference } from '@decaf-ts/as-graph/shared';
import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Credential parameter renderer: selects a stored credential reference.
 * @summary Credential parameter renderer: selects a stored credential reference.
 * @memberOf module:for-react.diagrams
 */
export function GraphCredentialParameterComponent({
  parameter,
  value,
  disabled,
  context,
  onValueChange,
}: GraphParameterRendererContract) {
  const credentialType = (parameter as { credentialType?: string }).credentialType ?? '';
  const options: GraphCredentialReference[] = (context?.credentialOptions ?? []).filter(
    (reference) => reference.credentialType === credentialType
  );
  const credentialId =
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)['credentialId'] === 'string'
      ? ((value as Record<string, unknown>)['credentialId'] as string)
      : '';
  return (
    <select
      className="graph-credential-parameter graph-parameter-select"
      value={credentialId}
      disabled={disabled}
      onChange={(event) => {
        const nextId = event.target.value;
        onValueChange(nextId ? { credentialId: nextId, credentialType } : undefined);
      }}
    >
      <option value="">Unset</option>
      {options.map((reference) => (
        <option key={reference.credentialId} value={reference.credentialId}>
          {reference.credentialId}
        </option>
      ))}
    </select>
  );
}

export default GraphCredentialParameterComponent;
