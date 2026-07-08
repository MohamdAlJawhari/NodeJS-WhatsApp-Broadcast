# Architecture Document

This document describes the current architecture of the Electron broadcast sender app and the intended direction for incremental refactoring. The app supports WhatsApp and Telegram broadcasting with contact files, templates, media, validation, logs, retry files, pause/resume/stop controls, and settings.

The goal is to keep the architecture simple for a Node.js + Electron desktop app while making future providers, such as Signal or Email, straightforward to add.

## 📁 Folder Structure

```text
.
├── electron/
│   ├── main.js
│   ├── preload.js
│   ├── contactFiles.js
│   ├── main/
│   │   ├── broadcastOrchestrator.js
│   │   ├── ipcHandlers.js
│   │   ├── logService.js
│   │   ├── provider.js
│   │   ├── runtimePaths.js
│   │   ├── settingsService.js
│   │   ├── telegramConnection.js
│   │   ├── validationService.js
│   │   └── whatsappConnection.js
│   └── renderer/
│       ├── index.html
│       ├── style.css
│       ├── app.js
│       ├── contactFiles.js
│       └── app/
│           ├── broadcastControls.js
│           ├── connection.js
│           ├── contacts.js
│           ├── dom.js
│           ├── logs.js
│           ├── media.js
│           ├── navigation.js
│           ├── preview.js
│           ├── provider.js
│           ├── qr.js
│           ├── settings.js
│           ├── toast.js
│           └── validation.js
├── src/
│   ├── app.js
│   ├── broadcastController.js
│   ├── browserRuntime.js
│   ├── contacts.js
│   ├── media.js
│   ├── phoneColumn.js
│   ├── sender.js
│   ├── settings.js
│   ├── telegramContacts.js
│   ├── telegramRecipient.js
│   ├── telegramRecipientResolver.js
│   ├── telegramSender.js
│   ├── template.js
│   ├── utils.js
│   ├── validator.js
│   ├── whatsapp.js
│   ├── broadcast/
│   │   └── logging.js
│   ├── security/
│   │   └── redaction.js
│   └── services/
│       ├── telegramLoginService.js
│       ├── telegramService.js
│       ├── telegramSession.js
│       └── whatsappService.js
├── scripts/
│   ├── afterPack.cjs
│   ├── telegramBroadcastTest.cjs
│   └── telegramQrLogin.cjs
├── tests/
│   ├── core-behavior.test.js
│   ├── redaction.test.js
│   └── sender-behavior.test.js
└── package.json
```

Runtime folders such as `logs`, `tokens`, `data`, media folders, and `.env` files are operational data, not application source. They should not be bundled into the packaged app and should not be inspected or logged during development.

## 🧱 Module Responsibilities

### Electron Main Process

| Module | Responsibility |
| --- | --- |
| `electron/main.js` | Electron startup, service construction, runtime path setup, browser window creation, IPC registration. |
| `electron/preload.js` | Safe renderer bridge. Exposes `window.electronAPI` methods and event subscriptions. |
| `electron/main/ipcHandlers.js` | Registers IPC handlers and routes renderer requests to main-process services. |
| `electron/main/runtimePaths.js` | Resolves writable runtime locations for development and packaged builds. |
| `electron/main/settingsService.js` | Loads settings, applies environment overrides, exposes sending settings and template persistence. |
| `electron/main/logService.js` | Finds, opens, and deletes generated log files. |
| `electron/main/validationService.js` | Builds user-facing validation warnings for contacts, templates, recipients, duplicates, and media. |
| `electron/main/broadcastOrchestrator.js` | Coordinates provider choice, validation, progress IPC events, console forwarding, and broadcast start/pause/resume/stop. |
| `electron/main/whatsappConnection.js` | Creates and owns the WhatsApp client session and QR/status callbacks. |
| `electron/main/telegramConnection.js` | Runs Telegram QR login flow and emits Telegram QR/status callbacks. |
| `electron/main/provider.js` | Normalizes supported provider names. |
| `electron/contactFiles.js` | Saved contact-file management and contact editor IPC handlers. |

### Renderer Process

| Module | Responsibility |
| --- | --- |
| `electron/renderer/index.html` | Static UI shell. |
| `electron/renderer/style.css` | UI styling. |
| `electron/renderer/app.js` | Renderer bootstrap and module wiring. |
| `electron/renderer/contactFiles.js` | Contact-file manager/editor UI behavior. |
| `electron/renderer/app/dom.js` | Shared DOM element lookup. |
| `electron/renderer/app/navigation.js` | Section navigation and saved contact file loading. |
| `electron/renderer/app/provider.js` | Provider selector UI state. |
| `electron/renderer/app/connection.js` | Connection buttons and provider connection status UI. |
| `electron/renderer/app/qr.js` | WhatsApp and Telegram QR rendering. |
| `electron/renderer/app/contacts.js` | Contact selection and contact state. |
| `electron/renderer/app/media.js` | Media selection UI state. |
| `electron/renderer/app/preview.js` | Message preview UI. |
| `electron/renderer/app/validation.js` | Validation panel and validation event handling. |
| `electron/renderer/app/broadcastControls.js` | Start, pause, resume, stop, retry, progress, counters. |
| `electron/renderer/app/logs.js` | Broadcast log display and log actions. |
| `electron/renderer/app/settings.js` | Settings/template loading and saving UI. |
| `electron/renderer/app/toast.js` | Toast notifications. |

### Core Node Modules

| Module | Responsibility |
| --- | --- |
| `src/sender.js` | Provider-neutral broadcast loop for WhatsApp-style and Telegram-style sends. Handles per-contact loop, pause/resume/stop checks, template generation, media retry, counters, and file output. |
| `src/telegramSender.js` | Telegram adapter around `sendBroadcast`, injecting Telegram messaging service and recipient resolver. |
| `src/services/whatsappService.js` | WhatsApp transport calls for text and media. |
| `src/services/telegramService.js` | Telegram client initialization, text send, media send, and disconnect. |
| `src/services/telegramLoginService.js` | Telegram QR login flow. |
| `src/services/telegramSession.js` | Telegram config/session path, load, save, and validation. |
| `src/contacts.js` | WhatsApp/general contact loading from spreadsheet files. |
| `src/telegramContacts.js` | Telegram contact loading rules. |
| `src/telegramRecipient.js` | Telegram recipient extraction from contact rows. |
| `src/telegramRecipientResolver.js` | Telegram send-time recipient resolution and phone lookup. |
| `src/validator.js` | Phone normalization, phone validation, template variable validation. |
| `src/media.js` | Media file validation. |
| `src/template.js` | Template placeholder replacement. |
| `src/settings.js` | Default settings and settings file load/save. |
| `src/phoneColumn.js` | Phone column naming and lookup rules. |
| `src/broadcastController.js` | Shared pause/resume/stop flags. |
| `src/broadcast/logging.js` | Contact log entries, log run IDs, recipient diagnostics, media type, log sanitization. |
| `src/security/redaction.js` | Shared redaction helpers for logs, console output, and sensitive structured values. |
| `src/browserRuntime.js` | Browser launch discovery/configuration for WhatsApp runtime. |
| `src/utils.js` | Shared delay and formatting utilities. |
| `src/app.js` | CLI entry point. Keep it secondary to the Electron flow. |

## 🔄 Data Flow

The app should keep data moving in one direction:

```text
Renderer UI
  -> preload API
  -> Electron IPC handler
  -> main-process service/orchestrator
  -> core src module/provider service
  -> provider SDK/API
  -> result/progress/log event
  -> renderer UI update
```

Typical broadcast data flow:

1. User selects a provider in the renderer.
2. User selects or loads a contact file.
3. Renderer calls `select-contacts-file` or saved-contact IPC methods.
4. Main process loads contacts using provider-specific contact rules.
5. Renderer requests preview and validation through IPC.
6. Main process builds validation warnings.
7. User starts broadcast.
8. Renderer calls `start-broadcast` with provider, contacts, template, and media file path.
9. `broadcastOrchestrator` validates again, loads sending settings, obtains the provider client, and starts the provider-neutral broadcast loop.
10. `sendBroadcast` resolves each recipient, renders the template for that contact, sends media/text through the selected provider service, updates counters, and writes logs.
11. Progress, counters, and redacted log messages are emitted back to the renderer.
12. Final result returns generated log file paths and counters.

Dependency direction:

```text
renderer -> preload -> electron/main -> src/core -> src/services/provider
```

Core `src` modules should not import renderer modules. Provider transport services should not import renderer or IPC modules. Renderer modules should not directly access Node filesystem APIs.

## 📡 IPC Communication

IPC is the boundary between the untrusted UI surface and privileged application behavior. The renderer should only call methods exposed in `electron/preload.js`.

### Request/Response IPC

| Renderer API | IPC channel | Main responsibility |
| --- | --- | --- |
| `selectContactsFile(options)` | `select-contacts-file` | Open file dialog, load contacts, optionally archive WhatsApp contacts. |
| `selectMediaFile()` | `select-media-file` | Open media file dialog. |
| `generatePreview(data)` | `generate-preview` | Generate preview messages. |
| `validateBroadcastInput(data)` | `validate-broadcast-input` | Return validation warnings and summary. |
| `connectWhatsApp()` | `connect-whatsapp` | Start/reuse WhatsApp connection. |
| `connectTelegram()` | `connect-telegram` | Start Telegram QR login flow. |
| `startBroadcast(data)` | `start-broadcast` | Validate, choose provider, run broadcast. |
| `pauseBroadcast()` | `pause-broadcast` | Set pause flag. |
| `resumeBroadcast()` | `resume-broadcast` | Clear pause flag. |
| `stopBroadcast()` | `stop-broadcast` | Set stop flag. |
| `openLogFolder(kind)` | `open-log-folder` | Open latest log or log folder. |
| `cleanLogFiles(kind)` | `clean-log-files` | Delete generated logs for a kind. |
| `loadLatestFailedContacts()` | `load-latest-failed-contacts` | Load latest retry/failed contacts file. |
| `loadSettings()` | `load-settings` | Load runtime settings. |
| `saveTemplate(template)` | `save-template` | Persist default template. |
| saved contact APIs | `list-*`, `load-*`, `save-*`, `delete-*`, `export-*` | Manage saved contact files. |

### Event IPC

| Event | Direction | Purpose |
| --- | --- | --- |
| `qr-code` | main -> renderer | WhatsApp QR image data. |
| `telegram-qr-code` | main -> renderer | Telegram QR data URL and login link metadata. |
| `connection-status` | main -> renderer | WhatsApp connection status. |
| `telegram-connection-status` | main -> renderer | Telegram connection status. |
| `broadcast-log` | main -> renderer | Redacted broadcast log line. |
| `broadcast-progress` | main -> renderer | Numeric broadcast progress percentage. |
| `broadcast-counters` | main -> renderer | Success, failed, skipped counters. |

IPC rules:

- Renderer sends user intent and UI state only.
- Main process owns dialogs, filesystem access, provider sessions, logs, and settings.
- Main process should validate inputs again before sending.
- Sensitive values must be redacted before crossing into visible logs.
- New provider-specific IPC channels should be avoided when a generic provider-aware channel can work.

## 🟢 WhatsApp Flow

```text
Renderer connect button
  -> connect-whatsapp
  -> whatsappConnection.connect(event)
  -> wppconnect.create(...)
  -> QR/status events
  -> stored client in main process
```

Broadcast flow:

1. Provider is normalized as `whatsapp`.
2. `broadcastOrchestrator` requires an active WhatsApp client.
3. Contacts are loaded through `src/contacts.js`.
4. Recipient is resolved by `resolveWhatsAppRecipient` in `src/sender.js`.
5. Phone validation runs through `src/validator.js`.
6. Valid recipient chat ID is formatted through `src/utils.js`.
7. Template is rendered through `src/template.js`.
8. Media is validated through `src/media.js`.
9. Sending happens through `src/services/whatsappService.js`.
10. Logs and counters are produced by the shared broadcast loop.

WhatsApp-specific ownership:

- Session name and WPPConnect token folder.
- Browser launch behavior.
- WhatsApp QR and status handling.
- WhatsApp chat ID formatting.
- WhatsApp transport implementation.

## 🔵 Telegram Flow

```text
Renderer connect button
  -> connect-telegram
  -> telegramConnection.connect(event)
  -> loginWithTelegramQr(...)
  -> Telegram QR/status events
  -> session saved under runtime token storage
```

Broadcast flow:

1. Provider is normalized as `telegram`.
2. `broadcastOrchestrator` initializes a Telegram client using `telegramService.initialize()`.
3. Telegram session is loaded and validated by `telegramSession.js`.
4. Contacts are loaded through `src/telegramContacts.js`.
5. Recipient is first interpreted by `src/telegramRecipient.js`.
6. Send-time phone lookup, if needed, is handled by `src/telegramRecipientResolver.js`.
7. `src/telegramSender.js` calls the shared `sendBroadcast` loop with Telegram-specific transport and recipient resolver.
8. Sending happens through `src/services/telegramService.js`.
9. Telegram client is disconnected after the broadcast finishes.

Telegram-specific ownership:

- API configuration validation.
- QR login flow and two-step verification handling.
- Session load/save.
- Recipient columns and recipient type rules.
- Username/direct target/phone lookup behavior.
- Telegram transport implementation.

## 📋 Broadcast Lifecycle

```text
idle
  -> validating
  -> connecting/ready
  -> sending
  -> paused
  -> sending
  -> stopped | completed | failed
```

Lifecycle steps:

1. Renderer gathers provider, contacts, template, media file, and settings-derived defaults.
2. Main process validates the broadcast request.
3. Main process prepares provider client and sending options.
4. `broadcastController.paused` and `broadcastController.stopped` are reset.
5. `sendBroadcast` starts a run and creates a run ID.
6. For each contact:
   - Check stop flag.
   - Wait while paused.
   - Resolve provider recipient.
   - Validate recipient.
   - Render template.
   - Validate media.
   - Send media with retry when media is selected.
   - Send text when no media is selected.
   - Update counters.
   - Append sanitized result log.
   - Wait per-message delay.
   - Pause after configured batch size.
7. At end:
   - Write failed summary CSV when needed.
   - Write retry contacts CSV when needed.
   - Write success summary CSV when needed.
   - Return counters and generated file paths.

Shared lifecycle responsibilities should stay provider-neutral. Provider code should only resolve recipients, connect/disconnect, and send text/media.

## 📝 Logging System

Generated logs:

| File type | Contents | Sensitivity |
| --- | --- | --- |
| `send-log-*.json` | Per-contact broadcast results. Uses sanitized log entries. | Medium |
| `success-*.csv` | Sanitized success summary rows. | Medium |
| `failed-*.csv` | Sanitized failed/skipped summary rows. | Medium |
| `retry-failed-*.csv` | Original failed contact rows needed for retry. | High |

Logging responsibilities:

- `src/broadcast/logging.js` creates run IDs, result rows, recipient diagnostics, media type fields, and sanitized text.
- `src/security/redaction.js` redacts phone-like values, contact identifiers, structured sensitive fields, token/password-like text, and contact rows.
- `electron/main/broadcastOrchestrator.js` forwards redacted broadcast console output to the renderer.
- `electron/main/logService.js` locates, opens, and deletes generated logs.

Important logging rules:

- Never log raw tokens, passwords, phone numbers, contact names, contact IDs, or full rendered templates.
- The normal JSON/summary logs should contain operational status only.
- Retry CSV files are intentionally sensitive because retry requires original contact fields. They need retention controls and careful access.
- File names should remain operational, not data-bearing.

## ⚙️ Settings System

Settings are split between source defaults, runtime settings, and optional environment overrides.

```text
src/settings.js
  -> default settings
  -> configured writable settings path
  -> load/save settings

electron/main/settingsService.js
  -> runtime path setup
  -> environment override resolution
  -> sending settings normalization
  -> default template save/load
```

Runtime behavior:

- Development writes under the app root.
- Packaged builds write under Electron `userData`.
- `runtimePaths.ensureRuntimePaths()` creates writable runtime directories.
- `settingsService.configureRuntimePaths()` points `src/settings.js` at the writable settings file.
- Sending settings are normalized before use: delays, batch size, batch pause, media retry attempts, and media retry delay.

Settings rules:

- Renderer should load/save settings through IPC only.
- Main process should own settings path resolution.
- Templates can contain sensitive placeholders, so rendered template output should not be logged.
- Environment variable names may be referenced by code, but values must not be printed.

## 🔒 Security Considerations

Security boundary:

```text
Renderer: UI state only
Preload: narrow API surface
Main process: filesystem, dialogs, provider sessions, settings, logs
Provider services: external messaging SDK/API calls
```

Current protections:

- Runtime folders are separated from packaged source.
- Build config excludes runtime data such as logs, tokens, data, media, and environment files.
- Redaction helpers protect normal logs and broadcast console output.
- Provider tokens/sessions live outside renderer code.
- Renderer uses `preload.js` instead of direct Node access.

High-risk areas:

- Retry CSV files contain original contact rows.
- Contact previews and rendered templates can include sensitive contact data.
- Provider SDK errors may include identifiers unless redacted.
- Token/session folders must be treated as private runtime storage.
- Opening log folders exposes generated artifacts to the local user.

Required practices:

- Do not inspect or commit runtime private data.
- Do not print real tokens, phone numbers, passwords, contact names, contact IDs, or full contact rows.
- Redact before sending log text to the renderer.
- Redact before writing normal JSON/summary logs.
- Keep retry files clearly classified as sensitive.
- Prefer counts, statuses, row numbers, and generic failure reasons in UI logs.

Recommended next hardening:

1. Add retention settings for log and retry files.
2. Separate retry files from summary logs in the UI and label them as sensitive.
3. Consider encrypted retry storage or a protected retry database.
4. Add automated tests that fail when known fake sensitive values appear in logs.
5. Ensure new providers implement the same redaction and logging rules.

## 🚀 Future Plugin Architecture

The current provider handling is small enough to stay simple, but future providers should be added through a provider adapter contract instead of more scattered `if provider === ...` checks.

### Target Provider Shape

```js
const provider = {
  id: "whatsapp",
  label: "WhatsApp",
  capabilities: {
    text: true,
    media: true,
    qrLogin: true,
    retryContacts: true
  },
  contactLoader,
  validateRecipient,
  resolveRecipient,
  connect,
  disconnect,
  sendText,
  sendMedia
};
```

### Suggested Future Structure

```text
src/
├── broadcast/
│   ├── loop.js
│   ├── logging.js
│   ├── retryStore.js
│   └── controller.js
├── providers/
│   ├── registry.js
│   ├── whatsapp/
│   │   ├── index.js
│   │   ├── connection.js
│   │   ├── contacts.js
│   │   ├── recipient.js
│   │   └── transport.js
│   ├── telegram/
│   │   ├── index.js
│   │   ├── connection.js
│   │   ├── contacts.js
│   │   ├── recipient.js
│   │   ├── session.js
│   │   └── transport.js
│   ├── signal/
│   │   └── index.js
│   └── email/
│       └── index.js
└── shared/
    ├── contacts.js
    ├── media.js
    ├── settings.js
    ├── template.js
    └── validation.js
```

### Provider Registry

The registry should answer:

- Which providers are available?
- What capabilities does each provider support?
- How does each provider connect?
- Which contact columns does each provider require?
- How does each provider resolve a recipient?
- Which transport methods are available?

Main process then depends on the registry, not on each provider directly.

```text
broadcastOrchestrator
  -> providerRegistry.get(providerId)
  -> provider.connect / provider.resolveRecipient / provider.sendText / provider.sendMedia
```

### Shared Logic Across Providers

Keep these provider-neutral:

- Broadcast lifecycle.
- Pause/resume/stop controller.
- Counters and progress callbacks.
- Template replacement.
- Media validation.
- Delay and batch timing.
- Retry policy.
- Normal log creation and redaction.
- Settings normalization.
- IPC event names where possible.

Keep these provider-specific:

- Connection/login flow.
- Token/session storage format.
- Contact column requirements.
- Recipient validation and resolution.
- Transport calls.
- Provider-specific diagnostics.
- Provider-specific capability limits.

### Incremental Migration Path

1. Define the provider adapter interface in a small registry module.
2. Wrap current WhatsApp behavior as the first adapter without moving business logic.
3. Wrap current Telegram behavior as the second adapter.
4. Move provider-specific contact loading behind the adapter.
5. Move provider-specific connection handling behind the adapter.
6. Move provider-specific recipient resolution behind the adapter.
7. Make `broadcastOrchestrator` call the adapter instead of branching on provider.
8. Add future providers by implementing the same adapter contract.

This avoids a full rewrite while creating a clear extension point for Signal, Email, or other broadcast providers.
