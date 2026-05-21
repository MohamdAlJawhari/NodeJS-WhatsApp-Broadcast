# AI Project Context

## Project Overview

This project is a local Node.js and Electron application for sending personalized WhatsApp broadcast messages. It reads contacts from spreadsheet files, applies a message template with `{{variable}}` placeholders, validates phone numbers, optionally attaches media, sends messages through WPPConnect, and writes success/failure/send logs.

There are two entry points:

- CLI flow: `npm start`, which runs `src/app.js`.
- Desktop GUI flow: `npm run electron`, which runs `electron/main.js` and the renderer in `electron/renderer/`.

## Project Goals

- Load contacts from `.xlsx`, `.xls`, or `.csv` files.
- Personalize each message from spreadsheet columns.
- Connect to WhatsApp via QR/session using WPPConnect.
- Send text-only messages or media with captions.
- Validate contacts, templates, media files, and duplicate phone numbers before sending.
- Track progress, pause/resume/stop sending, and retry failed contacts from generated logs.
- Keep a local library of saved contact files that can be selected, edited, exported, or deleted.

## Current Status

- The project has a working source layout for both CLI and Electron GUI.
- JavaScript syntax check passed for all project `.js` files with `node --check`.
- Installed top-level dependencies resolve locally with `npm.cmd ls --depth=0`.
- There are no project tests, lint configuration, formatter configuration, build scripts, packaging scripts, or CI config.
- The README only contains the project title, so setup and usage are mostly undocumented.
- `.env` exists locally, but `.env.example` is missing.
- The repo contains local runtime/data folders (`data/`, `media/`, `logs/`, `tokens/`) that are gitignored. Treat them as local/private data.

## Tech Stack

- Runtime: Node.js CommonJS.
- Desktop shell: Electron.
- WhatsApp automation: `@wppconnect-team/wppconnect`.
- Browser automation dependency: `puppeteer`.
- Spreadsheet parsing/writing: `xlsx`.
- CSV output: `csv-writer`.
- Phone validation: `libphonenumber-js`.
- Environment loading: `dotenv`.
- UI: plain HTML, CSS, and browser JavaScript.

Verified local versions:

- Node: `v22.15.0`
- npm: `11.9.0`
- Top-level packages: `@wppconnect-team/wppconnect@1.41.3`, `electron@42.0.1`, `puppeteer@24.43.0`, `xlsx@0.18.5`, `dotenv@17.4.2`, `libphonenumber-js@1.12.43`, `csv-writer@1.6.0`

## Folder And File Structure

- `package.json`: npm metadata, dependencies, and scripts.
- `package-lock.json`: npm lockfile version 3.
- `.env`: local runtime configuration. Do not expose values.
- `.gitignore`: excludes dependencies, `.env`, session/browser state, logs, data, media, and build artifacts.
- `README.md`: currently only a title.
- `settings.json`: stores the GUI default message template.
- `src/`: core CLI/shared application logic.
- `electron/`: Electron main process, preload bridge, and renderer UI.
- `data/`: local contacts and saved contact files. Gitignored.
- `media/`: local media attachments. Gitignored.
- `logs/`: generated send logs and success/failed CSVs. Gitignored.
- `tokens/`: WPPConnect/Chromium session and browser profile data. Gitignored and sensitive.
- `node_modules/`: installed dependencies.

## Main Features

- Contact loading from spreadsheets using first sheet and first row as headers.
- Case-insensitive configured phone column lookup.
- Template variable replacement with `{{column_name}}`.
- Phone normalization and validation with `libphonenumber-js`.
- Lebanon-specific fallback for 8-digit local numbers, adding `+961`.
- WhatsApp QR/session connection through WPPConnect.
- Text sending through `client.sendText`.
- Image sending through `client.sendImage`; PDF/MP4/other allowed media through `client.sendFile`.
- Random delays between messages.
- Batch pause support.
- Media retry support.
- JSON send log and CSV success/failed contact output.
- GUI validation panel for invalid numbers, duplicate numbers, missing template variables, empty message/media, and media issues.
- GUI contact file archive/library with deduplication by SHA-256 hash.
- GUI contact file editor for rows, columns, file name, and description.
- GUI pause, resume, stop, retry failed, open logs, and clean logs controls.

## Main Execution Flow

### CLI Flow

1. `src/app.js` loads `.env`.
2. Reads `SESSION_NAME`, `CONTACTS_FILE`, `MEDIA_FILE`, delay, batch, retry, and phone-column settings.
3. Defines a hardcoded message template in `src/app.js`.
4. Calls `loadContacts()` from `src/contacts.js`.
5. Prints contact previews and validates template variables.
6. Calls `createClient()` from `src/whatsapp.js`.
7. Displays QR/status in the terminal and waits for WhatsApp connection.
8. Asks for `yes/no` confirmation.
9. Calls `sendBroadcast()` from `src/sender.js`.
10. Sender validates each phone, generates a personalized message, sends text or media, writes logs, applies delays, and exports summary files.

### Electron GUI Flow

1. `npm run electron` starts `electron/main.js`.
2. Main process loads `.env` from the repo root.
3. Creates a `BrowserWindow` with `electron/preload.js`.
4. Renderer loads `electron/renderer/index.html`, `contactFiles.js`, and `app.js`.
5. Renderer calls exposed preload APIs.
6. Main process handles IPC for selecting contacts/media, connecting WhatsApp, validating inputs, starting/stopping broadcasts, logs, settings, and saved contacts.
7. `electron/main.js` reuses shared modules from `src/` for contact loading, validation, templating, media validation, and sending.
8. During a broadcast, `electron/main.js` temporarily wraps `console.log` and forwards sender logs to the renderer.

## How To Run Locally

Install dependencies:

```bash
npm install
```

Run the CLI flow:

```bash
npm start
```

Run the Electron GUI:

```bash
npm run electron
```

Use `npm.cmd` on Windows PowerShell if script execution policy blocks `npm.ps1`:

```powershell
npm.cmd ls --depth=0
npm.cmd run electron
```

Before sending real messages, confirm:

- WhatsApp account can scan/connect through WPPConnect.
- Contacts file exists and has the configured phone column.
- Template variables match spreadsheet column names.
- Media path exists if media sending is enabled.
- Delays and batch settings are appropriate.

## Environment Variables And Configuration

Observed `.env` key names:

- `SESSION_NAME`
- `CONTACTS_FILE`
- `MEDIA_FILE`
- `MESSAGE_DELAY_MIN`
- `MESSAGE_DELAY_MAX`
- `BATCH_SIZE`
- `BATCH_PAUSE`
- `PHONE_COLUMN`

Code also reads these keys:

- `MEDIA_RETRY_ATTEMPTS`
- `MEDIA_RETRY_DELAY`

Important notes:

- `.env.example` is missing.
- Local sample contact files use a `NUMBERS` column, while code defaults to `phone`. Set `PHONE_COLUMN` correctly or contact loading will fail.
- CLI uses `SESSION_NAME`, but the Electron connection currently hardcodes `employee-session`.
- CLI uses delay and batch environment variables, but Electron currently hardcodes delay and batch values.
- `settings.json` controls the GUI default template.

## Database Information

There is no application database schema, migration folder, or database client code.

Data persistence is file-based:

- Contacts: spreadsheet files under `data/` and `data/saved-contacts/`.
- Contact metadata: sidecar `.meta.json` files.
- Logs: JSON and CSV files under `logs/`.
- WhatsApp/Chromium session state: `tokens/`.

The `tokens/` directory contains browser profile/session data and should be treated as sensitive local state, not application schema.

## Important Commands

```bash
npm install
npm start
npm run electron
npm.cmd ls --depth=0
node --check src/app.js
```

No `test`, `lint`, `format`, `build`, or package scripts currently exist.

## Main Files

- `src/app.js`: CLI entry point. Loads contacts, connects WhatsApp, previews messages, asks for confirmation, and starts sending.
- `src/contacts.js`: Reads spreadsheet contacts from the first sheet and maps rows by header names.
- `src/validator.js`: Normalizes and validates phone numbers; extracts and checks template placeholders.
- `src/template.js`: Replaces `{{variable}}` placeholders with contact field values.
- `src/media.js`: Validates media path and allowed extensions.
- `src/utils.js`: Sleep, random delay, and WhatsApp chat ID formatting helpers.
- `src/whatsapp.js`: CLI WPPConnect client creation and connection polling.
- `src/sender.js`: Core broadcast loop, media/text sending, retry handling, counters, delay/batch pause, and log output.
- `src/broadcastController.js`: Shared pause/stop state used by the sender.
- `src/settings.js`: Reads and writes `settings.json`.
- `electron/main.js`: Electron main process, IPC handlers, WPPConnect connection, validation orchestration, logs, and broadcast start.
- `electron/preload.js`: Safe-ish renderer API bridge through `contextBridge`.
- `electron/contactFiles.js`: Saved contact file archive/library/editor backend.
- `electron/renderer/index.html`: GUI structure.
- `electron/renderer/app.js`: Main renderer controller for sender page, connection, validation, logs, and broadcast UI state.
- `electron/renderer/contactFiles.js`: Renderer controller for saved contact library and editor.
- `electron/renderer/style.css`: GUI styling.

## Known Issues And Bugs

- `src/whatsapp.js` has a broken timeout path: the timeout error is thrown inside a `try` and then caught by the same loop, so the 5-minute timeout does not actually stop waiting.
- `electron/main.js` says invalid media will fall back to text-only, but `src/sender.js` intentionally does not send text if media was selected and invalid. This can surprise users and mark messages failed.
- Electron ignores several `.env` settings: session name, message delay min/max, batch size, and batch pause are hardcoded in `electron/main.js`.
- `src/app.js` CLI preview manually replaces only `{{name}}` and `{{password}}`, so placeholders like `{{username}}` are not previewed accurately. Actual sending uses `generateMessage()` and is more complete.
- `package.json` has `"main": "index.js"`, but `index.js` does not exist. Scripts still work, but package entry metadata is wrong.
- There is no `.env.example`, so required setup is unclear.
- There are no project tests.
- There is no lint or formatting setup.
- README does not document installation, configuration, contact-file format, WhatsApp login/session behavior, or safe sending practices.
- Generated logs and success/failed CSVs can include phone numbers, message text, passwords, usernames, and other contact columns.
- `settings.json` default template includes credential-like fields (`password`, `username`), so be careful not to commit real templates or logs with secrets.
- Current dependency vulnerability status is unclear. `npm audit` could not be completed in the sandbox because it requires sending dependency inventory to the npm registry.

## Current Limitations

- No app packaging/distribution workflow is defined.
- No automated tests protect phone normalization, contact parsing, template rendering, log writing, or GUI IPC behavior.
- No dry-run mode that exercises the whole sender without contacting WhatsApp.
- No rate-limit policy beyond local delay settings.
- No clear handling for WhatsApp anti-spam/compliance constraints.
- No structured app-level logging library; sender writes JSON arrays and CSV files directly.
- Synchronous file operations are used heavily and can block the Electron main process for large contact files or large saved contact libraries.
- Media validation is repeated inside the per-contact loop.
- Phone normalization is Lebanon-biased for 8-digit numbers and may be incorrect for other countries.
- The renderer has no unsubscribe helpers for IPC event listeners, though the current UI is single-page.

## Important Design Decisions

- Contact files are treated as spreadsheet tables with the first row as headers.
- Message template variables are direct column-name placeholders.
- Invalid phone numbers are skipped but also exported in the failed contacts file for fixing/retry.
- If media is selected, the sender tries media-with-caption and does not fall back to text-only.
- Saved contact files are deduplicated by SHA-256 hash.
- Contact file edits are written back to the saved file itself.
- Runtime/session/data files are intentionally gitignored.

## Warnings Before Editing

- Do not expose `.env` values, contact data, logs, or token/session files.
- Do not run a real broadcast unless the user explicitly intends to send WhatsApp messages.
- Do not delete `tokens/` unless the user wants to log out/reset WhatsApp session state.
- Be careful with `logs/`, `data/`, and `media/`; they are local user data even though they are gitignored.
- Keep CLI and Electron behavior aligned when changing settings, validation, media handling, or sender options.
- Before changing phone validation, decide whether this project is Lebanon-only or should support configurable default countries.
- Before dependency upgrades, verify WPPConnect/Puppeteer/Electron compatibility together.
- If adding tests, start with pure modules (`validator`, `template`, `contacts`, `media`) before testing WPPConnect integration.

## Pending Tasks / Next Steps

1. Add `.env.example` with all supported keys and safe placeholder values.
2. Expand README with setup, required contact columns, run commands, and safety warnings.
3. Fix the WhatsApp connection timeout loop in `src/whatsapp.js`.
4. Align Electron settings with `.env` or a GUI settings model.
5. Fix the invalid-media warning or implement the documented fallback.
6. Replace the CLI preview logic with `generateMessage()`.
7. Add unit tests for contact loading, phone validation, template generation, media validation, and sender decision logic.
8. Add lint/format tooling.
9. Review dependency advisories with explicit user approval for `npm audit` or another approved vulnerability source.
10. Decide whether logs should redact sensitive template/contact fields.
