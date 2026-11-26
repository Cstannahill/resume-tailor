# Knowledge graph paint loop

The workspace graph lays out once, then keeps painting that same layout until the panel unmounts.

Sources: `src/components/modules/knowledge-graph/graph-panel.tsx`, `src/services/knowledge-graph.ts`, `src/app/page.tsx`. The panel is mounted only on `/`, inside the signed-in wall. `fetchKnowledgeGraph()` calls `GET /knowledge-graph` with no `userId`.

## Layout, then an open-ended redraw

When `nodes` is non-empty, `GraphCanvas` copies the nodes and runs `d3-force`:

| Force | Setting |
| --- | --- |
| Charge | `forceManyBody().strength(-90)` |
| Center | `forceCenter(width / 2, height / 2)` |
| Link | distance `140`, strength `0.5` |

The simulation is `.stop()`ped, then advanced with 240 synchronous `tick()` calls. It is not left running, and there is no `end` handler.

The effect then schedules `requestAnimationFrame`. Each frame clears the canvas and strokes every edge and disc again from the coordinates those 240 ticks produced. The callback schedules itself again. Nothing in the frame checks whether positions changed.

The loop is cancelled when the effect cleans up:

- the panel unmounts (leaving `/`, or signing out, which unmounts the wall)
- `nodes`, `edges`, or `dimensions` change

A filter pill does not cancel it. The selected type is stored in a ref and read on the next frame. Highlighted nodes use radius 7 and the saturated color; other nodes stay on the canvas at radius 5. Positions are not recomputed.

## What restarts the 240 ticks

`ResizeObserver` writes the container width and leaves height at the initial `420`. A width change is a new `dimensions` object, so the effect tears down the frame loop, runs 240 ticks at the new center, and starts painting again.

The first paint can use the initial width of `600` before the observer reports the container. That pass is replaced when the measured width arrives.

The canvas bitmap height stays `420`, matching the `h-[420px]` class. The bitmap width is `Math.max(1, Math.floor(dimensions.width))` CSS pixels. It is not multiplied by `devicePixelRatio`.

## Cost

Every frame walks the full node and edge arrays. The request is unscoped, and each indexed project contributes one node per analyzed file (the indexer cap is 250) plus a heuristic node and a summary node. Those coordinates do not change between frames. The dashboard pays for a full redraw for as long as `/` stays mounted, including while the tab is in the background (the browser throttles the callbacks; the component does not stop them).
