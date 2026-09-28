# Pundok Editor server

## Quick start: build and test locally

Run these commands from the repository root. The build produces the server and
renderer bundles that it serves:

```sh
npm run build:common && npm run build:renderer && npm run build:server
```

Create a local test account. The utility prompts for a password without
displaying it and writes a JSON users file containing a scrypt password hash
(not the plaintext password):

```sh
node packages/server/dist/create-user.mjs ./users.json alice
```

Start the server with the users file and other required settings. These
environment assignments apply directly to the server process, including when you
run this command in a new terminal. In development mode, the test account
`alice` uses your home directory as its backend data directory; shared
configuration lookup uses the desktop app's Linux configuration folder:

```sh
NODE_ENV=development \
USERS_FILE="$PWD/users.json" \
PUNDOK_TEST_CONFIGS_DIR="$HOME/.local/share/pundok-editor/configs" \
PUNDOK_TEST_USERNAME=alice \
PUNDOK_TEST_USER_DATA_DIR="$HOME" \
JWT_SECRET="$(openssl rand -hex 32)" \
npm run start:server
```

All `PUNDOK_TEST_*` overrides are development-only and the server refuses to
start if they are set outside development mode. The test configuration directory
is shared with all accounts. The
`PUNDOK_TEST_USERNAME`/`PUNDOK_TEST_USER_DATA_DIR` override applies only to the
named test account. Do not use these overrides on a server accessible to
untrusted users: they expose your local configurations and, for the named
account, use your full home directory as its backend data directory. Other
accounts continue to use `PUNDOK_DATA_DIR/users/<username>`.

Open `http://localhost:3001/` to load the editor. To test the API from another
terminal, replace `<password>` with the password entered when creating `alice`.
The login response includes a JWT:

```sh
curl -sS -X POST http://localhost:3001/backend/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"alice","password":"<password>"}'
```

Copy the returned token into `<JWT>` to make an authenticated request:

```sh
curl -sS -X POST http://localhost:3001/backend/available-configurations \
  -H 'Authorization: Bearer <JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"options":{}}'
```

Configuration, document open/save, Pandoc conversion, bookmarks, and related
renderer events use the shared backend package. Some desktop-only operations
(such as opening a result in the operating system) remain unavailable on the
server. For a container build and run, see `packages/server/Dockerfile`.

The server serves the renderer SPA and exposes its backend API under `/backend`.
The renderer's `NetBackend` sends JSON requests to this API instead of using
Electron's Main-Renderer IPC. Backend calls use `POST`; API responses are JSON.
The route names mirror the renderer-to-main IPC channel names where applicable.

The production image is based on `debian:trixie-slim` and installs the upstream
Pandoc GitHub release pinned by the Dockerfile's `PANDOC_VERSION` build argument
(currently `3.11`). Update that argument when a newer release is required.

## Authentication and request flow

1. When the editor logs in, `NetBackend` sends the username and password to
   `POST /backend/login`. This is the only API route that does not require a
   token. The server checks the credentials against the users file and returns a
   signed JWT and the username.
2. `NetBackend` stores the JWT in browser `localStorage` and sends it on
   subsequent requests in the `Authorization: Bearer <JWT>` header. This lets
   tabs on the same origin share the login session. The request body contains
   the arguments for the requested backend method, encoded as JSON.
3. The server verifies the token's signature and expiry, then takes the username
   from its `sub` claim. It does not accept a username from API request data for
   selecting a user's files. The server prepares that user's data directory and
   calls the corresponding backend method with the authenticated username.
4. The backend method's result is returned as JSON. An unauthenticated, invalid,
   expired, or revoked token receives HTTP 401. Other server errors receive HTTP 500.
5. `POST /backend/loggedin` checks the current token. `POST /backend/logout`
   revokes it and clears it from the renderer. If a protected request returns
   401, `NetBackend` also discards the token and the user needs to log in again.

JWTs are signed with HS256 and expire after `JWT_TTL_SECONDS` (8 hours by
default). There is no refresh-token flow: after expiry, the user must log in
again. The browser token is accessible to JavaScript running on the editor
origin, so protect the site against cross-site scripting and serve it only over
HTTPS outside local testing. Logout revocation is kept in server-process memory;
it is not shared across server replicas or preserved across restarts.

For example, a login request has this shape:

```http
POST /backend/login
Content-Type: application/json

{"user":"alice","password":"..."}
```

The response contains `token` and `user`. A later backend request includes the
token and sends method arguments in its JSON body:

```http
POST /backend/available-configurations
Authorization: Bearer <JWT>
Content-Type: application/json

{"options":{}}
```

The `/backend` routes cover the `NetBackend` methods. Shared operations run with
the authenticated user's backend directories. Document open/save and
Pandoc/script conversion are available; desktop-only window and shell actions
are intentionally not exposed by the server.

## Server-to-editor events

`GET /backend/events` is an authenticated Server-Sent Events stream carrying the
same Main-to-Renderer channel names and `ServerMessage` payloads that Electron
delivers through `IpcHub.send`. The renderer opens it with `fetch` so the JWT
remains in the `Authorization` header rather than a query parameter. The server
routes each event to all currently connected browser tabs for the authenticated
user. Events are not persisted or replayed after a disconnect.

Backend code that needs to work with both Electron and the server should depend
on `RendererHub` from `packages/backend`. `IpcHub` implements it in the desktop
app; the server creates a user-bound implementation:

```ts
const hub = backend.rendererHub(username);
hub.send('feedback', message);
```

## Configure users

Set `USERS_FILE` to a JSON file containing user records. Generate or replace an
account using the bundled interactive utility. Usernames may contain letters,
digits, periods, underscores, and hyphens (up to 64 characters). Passwords must
be at least 12 characters and no more than 1024; they are entered without
terminal echo and stored as scrypt hashes:

```sh
node packages/server/dist/create-user.mjs /path/to/users.json alice
```

The users file must be readable by the server and should be protected as a
credential file. It is a JSON array of user records. Each record has a
`username` and `passwordHash`, and may have a `docRepositories` array.
Repositories have a `name`, `description`, `url`, `type` (`"git"`), and
`projects` array; each project has a `name`, `description`, and `role`
(`"admin"` or `"user"`):

```json
{
  "username": "alice",
  "passwordHash": "scrypt$...",
  "docRepositories": [
    {
      "name": "Documents",
      "description": "Alice's project documents",
      "url": "https://example.org/documents.git",
      "type": "git",
      "projects": [
        {
          "name": "Book",
          "description": "The book manuscript",
          "role": "admin"
        }
      ]
    }
  ]
}
```

The account utility writes an empty array on new records and preserves existing
repositories when replacing credentials. Records without `docRepositories`
remain valid. The server loads the users file at startup; restart it after
creating or replacing an account.

The shared `getValue('doc-repositories')` backend operation always returns an
array. In server mode it reads the authenticated user's `docRepositories`
account field; in Electron mode it reads the optional `docrepos.json` file
from the app data directory. That file contains a bare JSON array using the
same repository shape shown above. A missing field or file returns an empty
array.

`JWT_SECRET` is required and must contain at least 32 bytes. Set it to a strong
secret and keep it private. `JWT_TTL_SECONDS` optionally sets token lifetime
(default: 28800 seconds; the minimum is 60 seconds).

## User and configuration directories

`PUNDOK_DATA_DIR` is the root of server data (default: `./data`). The server
uses a separate `users/<username>` directory beneath it for each authenticated
user. Shared configurations are read from `PUNDOK_CONFIGS_DIR` (default:
`<PUNDOK_DATA_DIR>/configs`); per-user configurations are kept under each user's
`localconfigs` subdirectory. Bundled files under `staticResources` are available
to every user and configuration as a final resource lookup fallback. The
username used for these paths is taken from the verified JWT. User-supplied
document, project, resource, and output paths are resolved under that user's
directory; paths that escape it are rejected.

For containers, persist the data directory and provide the users file and JWT
secret through protected mounts or your container platform's secret manager.
