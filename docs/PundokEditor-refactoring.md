# PundokEditor refactoring

`PundokEditor.vue` coordinates the editor UI, but it previously also contained
most of the document lifecycle, persistence, rendering, project management,
action routing, and drawer implementation. The refactoring split those
responsibilities into focused modules and child components while preserving the
existing Options API and public component behavior.

## Extracted responsibilities

The extracted files live in
`packages/renderer/src/components/editor/`:

- **`actionRouter.ts`** routes actions received through `lastAction`. It keeps
  document, project, feedback, transformation, selection, and viewer actions
  out of the component watcher.
- **`documentLifecycle.ts`** handles editor creation, document creation,
  opening, loading, pending save operations, configuration reloads, and native
  save state.
- **`documentPersistence.ts`** handles saving, exporting, importing,
  rendering, render-target tracking, render progress, stopping render jobs,
  and document transformations.
- **`projectManagement.ts`** handles project setup and reloads, project
  configuration updates, project structure loading and saving, and Git update
  checks.
- **`uiStateHelpers.ts`** contains dialog, stylesheet, PDF drawer, and drawer
  width state helpers.
- **`PundokEditorHeader.vue`** owns the header and menubar orchestration.
- **`PundokEditorPdfDrawer.vue`** owns the PDF viewer drawer and rendering event
  forwarding.
- **`PundokEditorStylesDrawer.vue`** owns the custom styles drawer.

`PundokEditor.vue` remains the coordinator. It declares reactive state,
computed values, watchers, template wiring, and thin methods that delegate to
the extracted modules. The modules receive the existing component state and
methods through host objects, which limits behavioral changes during the
refactor.

## Vue API style

The component now uses only the Options API. The small `<script setup>` block
was removed, and `setupQuasarIcons()` is called from the regular module
script. This is the smaller, lower-risk step from the original refactoring
plan; a full migration to `<script setup>` remains a separate, larger change.

## Shared state types

Repeated state shapes are defined once and reused:

- `RenderingTarget` in
  `packages/renderer/src/components/helpers/rendering.ts` describes a
  converter name, optional output path, and feedback messages. It is shared by
  the editor state, header, and output-renderer button.
- `PendingOperationExtraValueValue` in
  `packages/renderer/src/components/helpers/pending.ts` types pending extra
  values as `boolean`, matching the current toggle-based operation controls.

This removes the local rendering-target duplicate and replaces the
`any` value previously accepted by `pendingValueUpdate`.

## Behavior and validation

The refactoring intentionally keeps existing backend calls, feedback handling,
pending-operation behavior, and Options API method names intact. In
particular, save behavior while a document is loading or a save dialog is
open remains unchanged.

Validation completed during the refactoring:

- `npm run test:renderer` — 5 test files and 34 tests passed.
- `git diff --check` — passed.
- `npm run typecheck:renderer` — still reports the pre-existing
  `OutputRenderersButton.vue` error that `path` does not exist on `{}`; this is
  unrelated to the refactoring.

The extracted modules still use broad host interfaces for compatibility with
the Options API. Tightening those interfaces can be done independently once
the component's state and method contracts are formalized.
