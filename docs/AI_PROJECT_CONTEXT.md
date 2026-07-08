# AI Project Context

## Project Overview

This repository is a local Node.js/Electron application for sending personalized WhatsApp broadcast messages from spreadsheet contacts. It uses WPPConnect to connect to WhatsApp Web, reads `.xlsx`, `.xls`, and `.csv` contact files, applies `{{variable}}` placeholders from spreadsheet columns, optionally sends media, and writes local success/failure/retry logs.

The Electron desktop app is the primary supported workflow for internal users. A CLI entry point still exists for development and lower-level operational use.

## Current Status

- The project is a CommonJS Node.js application with an Electron GUI and a secondary CLI.
- The package entry point is `electron/main.js`.
- `npm start` and `npm run electron` both launch the Electron GUI.
- `npm run cli` launches `src/app.js`.
- `npm run build:win` builds a Windows x64 NSIS installer with `electron-builder`.
- `README.md` now documents install, runtime storage, build, logs, common problems, and a manual test checklist.
- `.env.example` exists and documents supported environment variables.
- `settings.json` exists and stores development defaults for the GUI template, WhatsApp session name, and sending controls.
- There are no automated tests, lint config, formatter config, or CI workflows.
- JavaScript syntax currently passes for all project `.js` and `.cjs` files under `src/`, `electron/`, and `scripts/`.
- Installed top-level dependencies resolve locally with `npm.cmd ls --depth=0`.
- Runtime folders such as `data/`, `media/`, `logs/`, `tokens/`, and `release/` exist locally but are gitignored user/runtime artifacts.

## Tech Stack

- Runtime: Node.js, CommonJS modules.
- Desktop shell: Electron.
- Packaging: `electron-builder`, NSIS Windows target, `rcedit` after-pack icon editing.
- WhatsApp automation: `@wppconnect-team/wppconnect`.
- Browser automation: Puppeteer, with local browser discovery for Edge/Chrome.
- Spreadsheet parsing/writing: `xlsx`.
- CSV output: `csv-writer`.
- Phone parsing/validation: `libphonenumber-js`.
- Environment loading: `dotenv`.
- UI: static HTML, CSS, and browser JavaScript through Electron preload IPC.

Verified local tool versions:

- Node: `v22.15.0`
- npm: `11.9.0`

Installed top-level package versions:

- `@wppconnect-team/wppconnect@1.41.3`
- `csv-writer@1.6.0`
- `dotenv@17.4.2`
- `electron@42.0.1`
- `electron-builder@24.13.3`
- `libphonenumber-js@1.12.43`
- `puppeteer@24.43.0`
- `rcedit@5.0.2`
- `xlsx@0.18.5`

`package.json` uses semver ranges, while `package-lock.json` pins the installed dependency graph.

## Repository Structure

- `.env.example`: Safe local-development environment template.
- `.gitignore`: Excludes dependencies, secrets, runtime data, browser/session state, logs, release output, caches, and editor files.
- `AI_PROJECT_CONTEXT.md`: This AI/developer context document.
- `README.md`: Human-facing setup, run, build, storage, logging, and manual QA notes.
- `package.json`: npm metadata, scripts, dependencies, and electron-builder configuration.
- `package-lock.json`: npm lockfile.
- `settings.json`: Development GUI settings and default message template.
- `build/icon.ico`: Windows app icon used by Electron/electron-builder.
- `build/icon.svg`: Source icon asset.
- `src/`: Shared application logic and CLI entry point.
- `electron/`: Electron main process, preload bridge, saved-contact backend, and renderer files.
- `electron/renderer/`: Static GUI HTML/CSS/JS.
- `scripts/afterPack.cjs`: Windows after-pack hook that applies the icon with `rcedit`.
- `data/`: Local development contact storage, including `data/saved-contacts/`; gitignored.
- `media/`: Local media attachments; gitignored.
- `logs/`: Generated send, success, failed, and retry logs; gitignored.
- `tokens/`: WPPConnect/Chromium session and browser-profile state; gitignored and sensitive.
- `release/`: Packaged build output; gitignored.
- `node_modules/`: Installed dependencies; gitignored.

## npm Scripts

```bash
npm start
npm run electron
npm run cli
npm run build:win
```

- `start`: `electron .`
- `electron`: `electron .`
- `cli`: `node src/app.js`
- `build:win`: `electron-builder --win --x64`

There are currently no `test`, `lint`, `format`, or clean scripts.

## Main Features

- Load contacts from Excel or CSV files using the first worksheet and first row as headers.
- Accept a configured phone column plus built-in aliases for `phone` and `NUMBERS`.
- Normalize selected phone-column data into the configured phone field for downstream sending.
- Validate phone numbers with `libphonenumber-js`.
- Apply a Lebanon-specific fallback that converts 8-digit local numbers to `+961...`.
- Generate personalized messages by replacing `{{column_name}}` placeholders.
- Warn when template variables are missing from contact rows.
- Connect to WhatsApp Web through WPPConnect and show QR/status in the GUI.
- Send text-only broadcasts with `client.sendText`.
- Send images with `client.sendImage` and supported non-image media with `client.sendFile`.
- Support `.jpg`, `.jpeg`, `.png`, `.pdf`, and `.mp4` attachments.
- Validate contacts, template, duplicates, empty message/media state, and media path before GUI sending.
- Pause, resume, and stop active broadcasts through shared controller state.
- Track success, failed, and skipped counters during sends.
- Write sanitized JSON send logs and sanitized success/failed CSV summaries.
- Write separate retry CSV files containing original failed contact rows so personalized retries can be regenerated.
- Load latest failed contacts for retry.
- Open latest log files or logs folder from the GUI.
- Clean generated success, failed, retry, and send logs from the GUI.
- Maintain a saved contact-file library under `data/saved-contacts/`.
- Archive imported contact files and deduplicate saved copies by SHA-256 file hash.
- Edit saved contact file name, description, rows, and columns from the GUI.
- Export or delete saved contact files from the GUI.
- Store runtime state under the project root during development and under Electron `userData` when packaged.
- Discover local Edge/Chrome installations or use configured browser paths for WPPConnect/Puppeteer.

## Execution Flow

### Electron GUI

1. `npm start` or `npm run electron` starts `electron/main.js`.
2. `electron/main.js` loads `.env` from the repository root for development.
3. The main process configures writable runtime paths.
4. In development, writable runtime data stays under the project root.
5. In packaged builds, writable runtime data goes under `app.getPath("userData")`.
6. Main creates a `BrowserWindow` and loads `electron/renderer/index.html`.
7. `electron/preload.js` exposes a controlled `window.electronAPI` bridge.
8. Renderer code handles navigation, file selection, preview, validation display, QR display, send state, counters, logs, and contact-library UI.
9. Main process handles IPC for selecting files, saved-contact operations, WhatsApp connection, validation, broadcast start/stop, logs, and settings.
10. Shared modules under `src/` handle contact parsing, phone validation, template generation, media validation, settings, browser discovery, and sending.
11. During sending, main temporarily wraps `console.log` and forwards sender log lines to the renderer.

### CLI

1. `npm run cli` runs `src/app.js`.
2. `.env` is loaded through `dotenv`.
3. The CLI reads `SESSION_NAME`, `CONTACTS_FILE`, `MEDIA_FILE`, delay settings, batch settings, media retry settings, and `PHONE_COLUMN`.
4. The CLI uses a hardcoded template in `src/app.js`.
5. Contacts are loaded through `loadContacts()`.
6. WhatsApp is connected through `createClient()` in `src/whatsapp.js`.
7. The terminal prints QR/status output.
8. The CLI previews the first three contacts and asks for `yes/no` confirmation.
9. `sendBroadcast()` performs validation, sending, delays, logging, and summary file generation.

## Runtime Storage

Development mode uses the repository root:

- `settings.json`
- `logs/`
- `data/saved-contacts/`
- `tokens/`

Packaged mode uses Electron user data:

- `%APPDATA%\WhatsApp Broadcast Sender\settings.json`
- `%APPDATA%\WhatsApp Broadcast Sender\logs\`
- `%APPDATA%\WhatsApp Broadcast Sender\data\saved-contacts\`
- `%APPDATA%\WhatsApp Broadcast Sender\tokens\`

`tokens/` contains WhatsApp/WPPConnect browser profile and session data. Treat it as sensitive local state. Deleting it logs out the WhatsApp session and forces a new QR scan.

## Configuration

`.env.example` documents these keys:

- `SESSION_NAME`
- `CONTACTS_FILE`
- `MEDIA_FILE`
- `MESSAGE_DELAY_MIN`
- `MESSAGE_DELAY_MAX`
- `BATCH_SIZE`
- `BATCH_PAUSE`
- `MEDIA_RETRY_ATTEMPTS`
- `MEDIA_RETRY_DELAY`
- `PHONE_COLUMN`

Other browser-related environment keys read by code:

- `PUPPETEER_EXECUTABLE_PATH`
- `CHROME_PATH`

Windows browser discovery also reads:

- `PROGRAMFILES`
- `PROGRAMFILES(X86)`
- `LOCALAPPDATA`

Important behavior:

- Timing values are milliseconds.
- The GUI uses settings from `settings.json` and environment overrides where applicable.
- Environment values override saved settings for session name and sending controls in `electron/main.js`.
- The packaged app excludes `.env` and `.env.*`.
- `CONTACTS_FILE` and `MEDIA_FILE` are CLI-only defaults. The GUI chooses contacts/media through file dialogs.
- `settings.json` in development stores `defaultTemplate`, `whatsappSessionName`, and `sending` defaults.
- `src/settings.js` will create or normalize missing settings fields when loading settings.

## Contact Files

- Supported extensions: `.xlsx`, `.xls`, `.csv`.
- Contacts are read from the first sheet.
- The first row is treated as column headers.
- Blank rows are filtered out.
- Every loaded contact file must include a valid phone column.
- Recognized phone columns include configured `PHONE_COLUMN`, `phone`, and `NUMBERS`, matched case-insensitively.
- If the actual phone column differs from configured `PHONE_COLUMN`, rows are copied into the configured phone key.
- Saved contact files can be edited in the GUI.
- The saved-contact editor prevents removing or renaming the detected phone column.
- Saved contact file metadata is stored in sidecar `.meta.json` files.

## Message Templates

- Template placeholders use `{{variable}}`.
- Placeholder names map directly to contact column names after trimming the placeholder key.
- Missing contact values become empty strings.
- Template validation reports placeholders that are not present in contact rows.
- GUI preview generates up to five sample messages.
- CLI preview is only a rough preview and currently replaces only `{{name}}` and `{{password}}`, while actual sending uses the full `generateMessage()` helper.

## Phone Validation

- `normalizePhone()` strips all characters except digits and `+`.
- 8-digit local numbers are interpreted as Lebanese numbers and prefixed with `+961`.
- Digit-only international-looking values are prefixed with `+`.
- `validatePhone()` uses `parsePhoneNumberFromString()` and `isValid()`.
- Successful validation returns a digit-only phone number for WhatsApp chat IDs, an international display format, and the detected country.
- Invalid phones are skipped during sending and included in failed/retry outputs.

## Media Handling

- Supported extensions are `.jpg`, `.jpeg`, `.png`, `.pdf`, and `.mp4`.
- Media path existence and extension are validated before sending.
- If media is selected and invalid, `sendBroadcast()` throws before the send loop starts.
- Images are sent through `client.sendImage()` with the generated message as caption.
- Non-image supported files are sent through `client.sendFile()` with the generated message as caption.
- If media is selected, the sender does not fall back to text-only after media failure.
- Media send attempts are retried according to `MEDIA_RETRY_ATTEMPTS` and `MEDIA_RETRY_DELAY`.

## Logging

Generated logs are written under the configured logs directory:

- `send-log-YYYY-MM-DD_HH-MM-SS.json`
- `success-YYYY-MM-DD_HH-MM-SS.csv`
- `failed-YYYY-MM-DD_HH-MM-SS.csv`
- `retry-failed-YYYY-MM-DD_HH-MM-SS.csv`

Normal JSON and CSV logs contain operational fields only:

- `timestamp`
- `rowNumber`
- `contactId`
- `phone`
- `status`
- `reason`
- `error`
- `warning`
- `mediaSelected`
- `mediaType`

Normal logs intentionally avoid full generated message bodies and full contact rows. Retry files intentionally contain original failed contact rows because retry needs the original template variables. Retry files are more sensitive than normal logs.

`sanitizeLogText()` currently stringifies values but does not redact phone numbers, truncate long errors, or remove secrets that might appear in exception text.

## Packaging

`electron-builder` is configured in `package.json`.

- App ID: `com.internal.whatsapp-broadcast-sender`
- Product name: `WhatsApp Broadcast Sender`
- Output directory: `release`
- Target: Windows NSIS x64
- Installer name: `${productName} Setup ${version}.${ext}`
- `asar`: disabled
- Code signing: disabled through `signAndEditExecutable: false`
- One-click installer: disabled
- Per-machine install: disabled
- Desktop and Start Menu shortcuts: enabled

Packaged files include:

- `package.json`
- `build/icon.ico`
- `electron/**/*`
- `src/**/*`
- `settings.json`

Packaged files exclude:

- `AI_PROJECT_CONTEXT.md`
- `README.md`
- `data/`
- `media/`
- `logs/`
- `tokens/`
- `.env`
- `.env.*`
- `.git/`
- `node_modules/.cache/`
- `release/`

`scripts/afterPack.cjs` runs only on Windows and applies `build/icon.ico` to the packaged executable with `rcedit`.

## Database And Schema

There is no application database, migration directory, ORM, SQL schema, or database client code.

Persistence is file-based:

- Contacts: selected spreadsheet files and archived saved contacts.
- Contact metadata: `.meta.json` sidecar files.
- Settings: JSON file.
- Logs: JSON and CSV files.
- WhatsApp session/browser state: WPPConnect/Chromium profile files under `tokens/`.

Chromium creates browser data stores inside `tokens/`, including cache, local storage, IndexedDB, and related profile files. Those are third-party browser/session state, not an application database schema.

## Important Source Files

- `src/app.js`: CLI entry point. Loads `.env`, contacts, connects WhatsApp, previews messages, asks for confirmation, and starts the sender.
- `src/browserRuntime.js`: Discovers configured/system Chromium browsers and builds Puppeteer launch options.
- `src/broadcastController.js`: Shared mutable pause/stop state.
- `src/contacts.js`: Reads spreadsheet contacts, filters blanks, validates phone-column presence, and normalizes phone column aliases.
- `src/media.js`: Validates supported media extensions and detects image media.
- `src/phoneColumn.js`: Central phone-column configuration, alias matching, and contact phone lookup.
- `src/sender.js`: Core broadcast loop, phone validation, text/media sending, retries, pause/stop checks, counters, delays, and log file writing.
- `src/settings.js`: Default settings, settings-path configuration, normalization, loading, and saving.
- `src/template.js`: Template placeholder replacement.
- `src/utils.js`: Sleep, random delay, and WhatsApp chat ID formatting.
- `src/validator.js`: Phone normalization/validation and template-variable validation.
- `src/whatsapp.js`: CLI WPPConnect client creation and connection polling.
- `electron/main.js`: Electron main process, runtime path configuration, IPC handlers, WPPConnect connection, validation orchestration, settings, logs, and broadcast start.
- `electron/preload.js`: Exposes renderer-safe IPC wrapper methods under `window.electronAPI`.
- `electron/contactFiles.js`: Saved contact archive/list/load/edit/export/delete backend.
- `electron/renderer/index.html`: GUI page structure.
- `electron/renderer/app.js`: Main renderer controller for connection, sender page, validation, preview, logs, counters, and send state.
- `electron/renderer/contactFiles.js`: Renderer controller for the saved contact-file library and editor.
- `electron/renderer/style.css`: GUI styling.
- `scripts/afterPack.cjs`: Windows executable icon after-pack hook.

## Validation And Verification Performed

Commands run during this review:

```powershell
git status --short
git ls-files
rg --files -g '!node_modules' -g '!vendor' -g '!storage/logs' -g '!bootstrap/cache'
node --version
npm.cmd --version
npm.cmd ls --depth=0
Get-ChildItem -Path src,electron,scripts -Recurse -File -Include *.js,*.cjs | ForEach-Object { node --check $_.FullName }
```

Results:

- Git worktree was clean before this context update.
- All tracked source/config/doc files were reviewed at least at the project-context level.
- Node and npm versions were captured.
- Top-level installed dependencies resolved successfully.
- JavaScript syntax checks produced no errors.

Not performed:

- No real WhatsApp connection or broadcast send was started.
- No Electron GUI smoke test was launched.
- No Windows installer build was run.
- No `npm audit` was run because it requires network access and sends dependency inventory to the npm registry.

## Known Issues And Risks

- CLI WhatsApp connection timeout in `src/whatsapp.js` is ineffective: the timeout error is thrown inside the loop's `try` block and then caught by the same loop, so waiting can continue indefinitely.
- CLI preview in `src/app.js` does not use `generateMessage()` and currently omits placeholders such as `{{username}}` from preview output.
- CLI and GUI are not fully feature-aligned. The GUI is the documented supported path, while the CLI still uses a hardcoded template and separate connection helper.
- There is no automated test coverage for contact parsing, phone validation, template rendering, media validation, sender behavior, runtime path selection, or Electron IPC.
- There is no linting or formatting enforcement.
- There is no CI workflow.
- Dependency vulnerability status is unknown because no audit was run during this review.
- Phone normalization is Lebanon-biased for 8-digit local numbers and may be wrong for other countries unless the project is intentionally Lebanon-only.
- Duplicate valid phone numbers generate warnings but are still sent if the user proceeds.
- If media is selected and media sending fails after retries, the sender records a failure and does not send a text-only fallback.
- `sanitizeLogText()` does not actually redact sensitive values if future errors include secrets or message content.
- Retry files store original failed contact rows by design and can contain names, passwords, usernames, phone numbers, or any spreadsheet columns.
- The renderer registers IPC listeners without unsubscribe helpers. The current app is single-page, so this is low risk unless the renderer is reloaded or components become dynamic.
- File operations for saved-contact listing, hashing, parsing, writing, and log cleanup are synchronous in the Electron main process and may block the UI for large files or large contact libraries.
- Saved-contact deduplication hashes whole files and recomputes hashes during listing and import.
- `client` connection lifecycle in `electron/main.js` has no explicit logout/disconnect/reconnect control after a stale or disconnected client exists.
- The packaged app is unsigned, so Windows SmartScreen or publisher warnings are expected.
- `asar` is disabled, which makes packaged source files easier to inspect and modify.

## Warnings Before Editing Or Running

- Do not read, print, commit, or expose `.env` values.
- Do not inspect or expose contact data, retry files, logs, media, or WhatsApp token files unless the user explicitly asks and understands the sensitivity.
- Do not run a real broadcast unless the user explicitly intends to send WhatsApp messages.
- Do not delete `tokens/` unless the user wants to log out/reset WhatsApp session state.
- Treat `data/`, `media/`, `logs/`, `tokens/`, and `release/` as local runtime artifacts even when they exist in the working directory.
- Keep CLI and Electron behavior aligned when changing sending options, validation, media rules, logging, or phone-column behavior.
- Before changing phone normalization, decide whether the app is Lebanon-specific or should support configurable country defaults.
- Before dependency upgrades, test WPPConnect, Puppeteer/browser discovery, Electron runtime, and Windows packaging together.
- Do not use `npm audit fix --force` blindly because it can introduce breaking upgrades.

## Recommended Next Steps

1. Add focused unit tests for `validator`, `template`, `phoneColumn`, `contacts`, and `media`.
2. Add sender tests using a fake WPPConnect client for text, media success, media retry failure, skipped contacts, and log output.
3. Fix the CLI connection timeout loop in `src/whatsapp.js`.
4. Make CLI preview use `generateMessage()` so preview and actual sending match.
5. Decide whether the CLI should remain supported or be marked development-only.
6. Add a dry-run mode that validates and logs intended sends without contacting WhatsApp.
7. Add lint/format tooling and a CI workflow.
8. Add a reconnect/logout/reset-session workflow for the GUI.
9. Consider moving heavy saved-contact operations off the Electron main thread or adding progress feedback for large libraries.
10. Review whether logs/retry files should redact or encrypt sensitive columns such as passwords.
11. Run a dependency vulnerability review with explicit approval for network access.
12. Run the README manual test checklist before distributing a new internal build.
