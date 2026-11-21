# Paths management

Pundok Editor runs in an Electron renderer or a browser, while filesystem
operations run in a desktop main process or a server process on another
machine. Treat a path as data shared across this boundary, not as a native
`node:path` value owned by the renderer.

The shared path functions are in
`packages/common/src/documentPath.ts` and are re-exported from
`packages/common/src/index.ts`. Use those functions from renderer code and from
shared/backend code whenever a value can cross the boundary. Use Node's
`node:path` only in code that is explicitly tied to the backend host's
filesystem.

## The path representations

There are three representations to keep distinct:

1. **Document paths** are the transport form used by the common package,
   renderer, IPC, and HTTP. They always use `/`, preserve POSIX roots, Windows
   drive roots, and UNC roots, and use forward slashes even when the renderer
   is running on Linux and the path belongs to Windows.
2. **File URLs** are an external/serializable representation such as
   `file:///home/alice/book.md`,
   `file:///C:/Users/alice/book.md`, or
   `file://server/share/book.md`.
3. **Native paths** contain the backend OS separator and are used only for
   calls to the filesystem, operating system, Pandoc, and other native
   programs.

Examples of the same document path across input styles:

| Source                           | Normalized document path |
| -------------------------------- | ------------------------ |
| `/home/alice/book.md`            | `/home/alice/book.md`    |
| `/Users/alice/book.md`           | `/Users/alice/book.md`   |
| `C:\Users\alice\book.md`         | `C:/Users/alice/book.md` |
| `\\server\share\book.md`         | `//server/share/book.md` |
| `file:///C:/Users/alice/book.md` | `C:/Users/alice/book.md` |

Do not infer the semantics of a Windows path from the renderer's current
operating system. In a browser, `path-browserify` and its host-independent
POSIX defaults cannot recognize drive letters or UNC roots correctly. Do not
add new renderer uses of `path`, `node:path`, or `path-browserify`.

## Required helpers

Always choose the helper according to the operation instead of manipulating
strings with `/`, `\`, `startsWith`, regular expressions, or array splits.

### Normalization and inspection

- `normalizeDocumentPath(path)` is the entry point for an existing filesystem
  path. It accepts native Windows, POSIX, UNC, and `file:` forms and converts
  them to the document-path form. It also decodes the URL form and normalizes
  drive-letter case.
- `documentLocation(value)` distinguishes a filesystem path or `file:` URL
  (`kind: 'file'`) from a non-file URL (`kind: 'url'`). A URL such as
  `https://example.org/book.md` is not a document path.
- `isDocumentPathAbsolute(path)` recognizes POSIX, Windows drive, and UNC
  absolute paths without consulting the renderer OS.
- `documentPathRoot(path)` returns `/`, `C:/`, or `//server/share/` as
  appropriate.
- `documentPathBaseName(path)` and `documentPathDirName(path)` replace
  `basename` and `dirname` for document paths.
- `splitFolderAndDoc(path)` returns the normalized directory and document name
  and is useful for folder-dialog results.
- `documentPathsEqual(first, second)` must be used for path comparisons. It is
  case-insensitive for drive-letter and UNC paths and case-sensitive for
  POSIX/macOS paths.

### Construction and resolution

- `joinDocumentPath(base, child)` appends a relative child to a base. It does
  not interpret `.` or `..`; use resolution when those segments matter.
- `resolveDocumentPath(base, path)` resolves a relative path against a base
  and collapses `.` and `..`. Absolute paths are returned unchanged apart
  from normalization. This operation is lexical; it does not touch the
  filesystem or follow symlinks.
- `resolveDocumentContextPath(path, projectPath)` resolves a document or
  folder path relative to its project's base when the path is not absolute.
  Without a project, it only normalizes the path. Use this for `DocumentContext`
  and document-shaped payloads that carry both `path` and `project`.
- `relativeDocumentPath(from, to)` computes a portable relative path. It
  compares Windows and UNC roots case-insensitively and returns the normalized
  absolute target when the roots differ. Use it when persisting a
  project-relative source or resource reference.

For a path inside a project, prefer:

```ts
const absolute = resolveDocumentPath(project.path, component.src);
const projectRelative = relativeDocumentPath(project.path, selectedPath);
```

Do not use `relativeDocumentPath` as a containment check by itself. Backend
adapters responsible for security must still resolve the candidate and
validate that it remains inside the permitted root.

### File URLs

- `documentPathToFileUrl(path)` converts a normalized/native filesystem path to
  a correctly encoded `file:` URL.
- `documentPathFromFileUrl(url)` converts a `file:` URL to a document path. It
  also accepts a path and normalizes it, which makes it convenient at input
  boundaries.

Use these two functions together instead of prepending `file://`, calling
`encodeURI`/`decodeURI`, or extracting `URL.pathname` manually. The helpers
handle spaces, `#`, `?`, literal or encoded percent signs, Windows drives,
UNC authorities, and legacy fully encoded `file:` URLs.

## Paths inside projects

A `PundokEditorProject` has two important path fields:

- `project.path` is the project base directory. It is normally an absolute
  path at runtime, although a server request can supply a path relative to the
  authenticated user's root and the server will resolve it.
- `project.rootDocument` is a path stored relative to `project.path`. Keep it
  relative in project configuration and while transporting the project across
  the renderer/backend boundary.

Resolve the root document only when it is needed as a filesystem path:

```ts
const rootPath = resolveDocumentPath(project.path, project.rootDocument);
```

The same rule applies to component `src` values, custom CSS, templates,
images, and other project-owned references: keep the portable value relative
when that is the persisted/UI contract, and resolve it only for a concrete
operation.

`projectSourceVariants(src, projectPath)` creates normalized absolute and
project-relative forms for matching a source against a project structure. Use
the project-structure helpers rather than comparing one raw `src` spelling
with another.

Relative paths must not silently change their base:

```text
project.path       /work/books/manual
document.path      chapters/introduction.md
resolved path      /work/books/manual/chapters/introduction.md
rootDocument       index.md
```

An absolute `document.path` or one supplied as a `file:` URL is not rebased
onto the project. A relative `document.path` uses `project.path`.

When a value is explicitly a document-relative reference rather than a
project-relative one, use the document directory as the base instead:

```ts
const documentDirectory = documentPathDirName(document.path);
const resource = resolveDocumentPath(documentDirectory, relativeResource);
```

## Renderer/backend boundary

Paths can make several trips:

```text
renderer -> open/save -> backend -> response -> renderer
backend -> bookmark/event/Synctex -> renderer -> backend
```

Every leg must preserve the same path information:

- Do not discard drive letters, UNC authorities, file URL encoding, or the
  relative/absolute distinction.
- Normalize or resolve with the common helpers before comparing or composing
  paths.
- Send `project.path` together with relative document fields when resolution
  depends on that project.
- Preserve `rootDocument` as relative to `project.path`; do not replace it with
  an absolute path in a project sent back to the renderer.
- Avoid converting a file path to a URL unless the consuming API or the public
  bookmark/display contract requires a URL.

The desktop and server adapters may localize a path for real filesystem use.
`localizePath(path)` in `packages/backend/src/filesystem.ts` converts the
document-path separator form into the backend host's native form.
`localizeDocumentPath(path, projectPath)` additionally resolves a relative
document path against its project before localization. These helpers belong
at the filesystem boundary; do not import or call them from renderer code.

In particular, backend handlers should resolve incoming
`DocumentContext.path`/`CxDocument.path` with `localizeDocumentPath` before
filesystem access. Browser/server adapters should retain abstract project
semantics in response data after applying any required server confinement.

## Server confinement

The server gets an authenticated username from the route layer, never from a
path or renderer-supplied project field. Every requested document, project,
resource, output, folder, image, Git, and SyncTeX path must be constrained to
that user's data directory.

For a server request:

1. Normalize the transport path.
2. Resolve a relative project path against the project base where applicable.
3. Resolve the candidate beneath the authenticated user's root.
4. Reject an escape from that root before accessing the filesystem.
5. Validate a project root document after resolving it, but leave the
   `rootDocument` value relative in the returned project.

Use the server's existing `userPath`/`existingUserPath` and
`resourcePathForUser` boundary methods rather than duplicating lexical
confinement in routes or handlers. Client-side helpers provide portability,
not security.

## Renderer IPC values

Electron's context bridge uses structured cloning. Vue `reactive` objects and
arrays are proxies, and these proxies cannot be cloned across that boundary.
This can produce `An object could not be cloned`.

Before sending a non-primitive structured value through `window.ipc`, pass it
through:

```ts
import { plainIpcValue } from './ipcValue';

window.ipc.someOperation(plainIpcValue(options));
```

`plainIpcValue` recursively copies JSON-compatible data and intentionally
preserves `undefined`. Apply it to every object or array passed through IPC,
including nested project/configuration/rendering/Git options and path arrays.
Primitive strings and numbers are safe. Existing JSON serialization via
`JSON.stringify` is also safe, but it must remain paired with the corresponding
backend deserialization contract.

Do not rely on only flattening the top-level project or options object; nested
Vue proxies remain uncloneable. When adding an IPC method, classify every
parameter explicitly:

- primitive: pass directly;
- JSON string: serialize intentionally;
- object or array: pass through `plainIpcValue`.

The HTTP `NetBackend` does not need `plainIpcValue` for Electron cloning, but
the shared payload shape should still contain plain serializable path and
configuration values.

## Adding path behavior

New path-related code should include tests for at least the representation it
introduces:

- POSIX/macOS absolute paths;
- Windows drive paths, including a round trip from a `file:` URL;
- UNC paths;
- relative paths with `.` and `..`;
- reserved and literal percent characters;
- project-relative and absolute references with the same project;
- renderer/backend round trips;
- server user-root rejection for backend paths.

For any path passed through a new IPC object, also test that a reactive value
can be sent after `plainIpcValue` has removed the Vue proxy.
