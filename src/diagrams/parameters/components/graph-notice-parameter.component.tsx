import type { GraphParameterRendererContract } from '../GraphParameterRendererContract.js';

/**
 * @description Notice parameter renderer: read-only informational text instead of an input.
 * @summary Notice parameter renderer: read-only informational text instead of an input.
 * @memberOf module:for-react.diagrams
 */
export function GraphNoticeParameterComponent({ parameter }: GraphParameterRendererContract) {
  const content = (parameter as { noticeContent?: string }).noticeContent ?? '';
  const variant = (parameter as { noticeVariant?: string }).noticeVariant ?? 'info';
  return (
    <div className={`graph-notice-parameter graph-notice-${variant}`} role="note">
      {content}
    </div>
  );
}

export default GraphNoticeParameterComponent;
