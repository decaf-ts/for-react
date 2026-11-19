/**
 * The agent surface's provider imports the graph-run transport, whose module
 * graph pulls in the diagrams public API (`@xyflow/react`, ESM-only). Import
 * this module first from an agent spec to install the same capture-only
 * baseline the diagrams specs use; no agent test renders a graph canvas.
 */
jest.mock("@xyflow/react", () => {
  // jest.mock factories are hoisted above imports; `require` is the only way to reach React here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");
  const Position = { Left: "left", Right: "right", Top: "top", Bottom: "bottom" };
  const flow: { props: Record<string, unknown> | null } = { props: null };
  const updateNodeInternals = jest.fn();
  const useFlowState = (initial: unknown) => {
    const [state, setState] = React.useState(initial);
    return [state, setState, () => undefined];
  };
  return {
    __flow: flow,
    __updateNodeInternals: updateNodeInternals,
    Position,
    ConnectionMode: { Strict: "strict" },
    ReactFlow: (props: Record<string, unknown>) => {
      flow.props = props;
      return React.createElement(
        "div",
        { "data-testid": "react-flow" },
        props.children
      );
    },
    ReactFlowProvider: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    Panel: ({ children }: { children: unknown }) =>
      React.createElement("div", {}, children),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: (props: Record<string, unknown>) =>
      React.createElement("div", {
        "data-handle-id": props.id,
        "data-handle-position": props.position,
      }),
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }: { children: unknown }) =>
      React.createElement("div", {}, children),
    getBezierPath: () => ["", 0, 0, 0, 0],
    useEdges: () => [],
    useUpdateNodeInternals: () => updateNodeInternals,
    reconnectEdge: jest.fn((edge: unknown) => edge),
    useReactFlow: () => ({ screenToFlowPosition: (position: unknown) => position }),
    useNodesState: useFlowState,
    useEdgesState: useFlowState,
  };
});

export {};
