# Refactor Towards N8N-Style Graph Editing

## Goal Description
The user wants to make node `id` and `label` predefined and make graph editing behave more like **n8n**. In n8n, node IDs are internally managed UUIDs that the user shouldn't need to manually assign, labels are automatically set based on the node type, and forming connections across nodes is done visually rather than through dropdown lists.

## Proposed Changes

### 1. [frontend/src/utils/ids.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/utils/ids.ts)
- **[MODIFY]** Update [createNodeId](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/utils/ids.ts#3-9) and [createNodeIdFromBase](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/utils/ids.ts#10-17) to use a short random ID (e.g. UUID or `Math.random().toString(36)`) instead of manual predictable strings like `baseId-2`. This ensures there are never collisions and the ID generation mechanism is purely abstract and hidden.
- **[MODIFY]** Ensure [createLabelFromBase](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/utils/ids.ts#18-23) still works cleanly since it relies on comparing base IDs, but we might just construct generic names for labels.

### 2. [frontend/src/components/NodeEditor.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/components/NodeEditor.tsx)
- **[MODIFY]** For the [Id](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/utils/ids.ts#3-9) field, update the UI so that the `id` is `readOnly`. The user shouldn't edit the UUID of a node which could break edge definitions. We might display the ID as just text instead of an editable input to emphasize it is system-managed. The `label` will obviously remain editable.

### 3. [frontend/src/components/GraphToolbar.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/components/GraphToolbar.tsx)
- **[MODIFY]** Completely remove the `.edge-builder` block and its associated state (`edgeSource`, `edgeTarget`). N8N is fully visual for drawing edges. Users should solely use the visual graph builder's `.eh-handle` grab points (provided by `cytoscape-edgehandles`) to draw edges from node to node.

### 4. Optional: Graph Canvas Interactions
- The `edgehandles` logic is already integrated in [GraphCanvas.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/components/GraphCanvas.tsx). We will retain that logic. No major change is needed there since the feature is enabled.

## Verification Plan

### Automated Tests
Currently not running automated test suites in place for frontend behaviors.

### Manual Verification
1. I will add a node from the UI and observe that it creates a node safely at the center, with a randomly generated ID and a sensible label.
2. I will expand the Node Inspector panel by clicking on the new node and verify the ID cannot be mutated manually.
3. I will add a second node and verify we no longer have dropdown boxes to formulate an edge, and that we can effectively just use the visual graph builder drag handles to attach components together.
