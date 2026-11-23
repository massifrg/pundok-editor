# TypeScript 7 migration assessment

Assessment performed on 2026-11-23 against TypeScript 7.0.2.

## Conclusion

The source code is close to TypeScript 7-ready, but the current npm dependency
graph is not. A clean TypeScript 7 installation fails during dependency
resolution before the code can be compiled.

The migration should wait until the TypeDoc, Volar/vue-tsc, typescript-eslint,
and `ts-json-schema-generator` dependency chains publish versions with
declared TypeScript 7 support. Using `--force` or `--legacy-peer-deps` would
only hide unsupported combinations.

## Dependency blockers

| Dependency | Current constraint | Effect |
| --- | --- | --- |
| `@typescript-eslint/eslint-plugin` 8.73.0 | TypeScript `>=4.8.4 <6.1.0` | Immediate `npm ERESOLVE` failure with TypeScript 7 |
| `@typescript-eslint/parser` 8.73.0 and its supporting packages | TypeScript `>=4.8.4 <6.1.0` | Immediate `npm ERESOLVE` failure with TypeScript 7 |
| `typedoc` 0.28.20 | TypeScript 5.0.x through 6.0.x | Unsupported peer dependency |
| `@volar/typescript` 2.4.30 | TypeScript `<7` | Unsupported transitive dependency of `vue-tsc` |
| `@volar/language-service` 2.4.30 | TypeScript `<7` | Unsupported transitive dependency of the Volar stack |
| `ts-json-schema-generator` 2.10.0 | Dependency on TypeScript `>=5.9 <7` | Would retain a separate TypeScript 6 installation |
| `vue-tsc` 3.3.14 | TypeScript `>=5.0.0` | No direct upper bound, but currently pulls incompatible Volar packages |

The latest stable releases at the time of assessment did not advertise
TypeScript 7 support for these blockers. The typescript-eslint packages also
declare an optional peer on a future `@typescript/native` package alias, but the
supported range starts at TypeScript 7.1 and does not make
`typescript@7.0.2` a supported peer.

Several other consumers impose no relevant TypeScript 7 upper bound:

- `@quasar/app-vite`: TypeScript `>=5`
- `pinia`: TypeScript `>=5.6.0`
- `ts-api-utils`: TypeScript `>=4.8.4`
- `ts-essentials`: TypeScript `>=4.5.0`
- `vue`: TypeScript `*`

## TypeScript configuration changes

The current TypeScript 7 compiler reports configuration errors before checking
all packages:

1. `baseUrl` has been removed. It is currently present in the root
   configuration and the common, main, preload, renderer, server, and Pandoc
   package configurations.
2. `moduleResolution: "Node"` has been removed as the old Node 10 resolver. The
   preload and Pandoc configurations still use it.
3. Paths without a `./` prefix are no longer allowed when `baseUrl` is absent.
   Affected path mappings must be relative to the configuration file.

The tested replacement preserves current behavior:

- Remove `baseUrl`.
- Replace legacy `moduleResolution: "Node"` with `"bundler"` where applicable.
- Prefix affected `paths` targets with `./`.
- Add `"*": ["./*"]` to the renderer `paths` map to preserve resolution of bare
  `src/...` imports without `baseUrl`.

## Source compatibility check

TypeScript 7.0.2 was run directly against the repository with temporary
equivalents of the configuration changes above. The temporary files were
removed afterward.

After those mechanical configuration updates:

- The root, common, main, backend, preload, server, and Pandoc configurations
  passed type checking.
- The renderer passed `vue-tsc` type checking with TypeScript 7.0.2.
- No migration-related source diagnostics were found.

This validates source compatibility, not runtime support from the dependency
chain. Vite, ESLint, schema generation, documentation generation, and the full
test suite still need to be exercised after compatible package releases are
available.

## Migration gate

Proceed when all of the following are available:

1. typescript-eslint releases a stable version whose peer range includes the
   selected TypeScript 7 release.
2. The current `vue-tsc`/Volar stack supports TypeScript 7.
3. TypeDoc supports TypeScript 7.
4. `ts-json-schema-generator` no longer requires TypeScript 6.
5. `npm install` succeeds without `--force` or `--legacy-peer-deps`.

Then:

1. Upgrade the TypeScript-related dependencies together.
2. Apply the configuration changes described above.
3. Regenerate the lockfile with a clean npm installation.
4. Run type checking, linting, schema generation, documentation generation,
   builds, and the relevant test suites.
