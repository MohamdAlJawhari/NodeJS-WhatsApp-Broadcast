# WhatsApp Broadcast Sender

Internal Electron desktop app for sending personalized WhatsApp broadcast messages from spreadsheet contacts. The app uses WPPConnect to connect to WhatsApp Web, reads Excel/CSV contact files, applies a message template with `{{variable}}` placeholders, optionally sends media, and writes local logs for review and retry.

This is an internal tool. Do not commit real contact files, logs, tokens, or `.env` files.

## 🎥 Demo Video

[![Watch the video](https://img.youtube.com/vi/2F2NlaBmnTg/0.jpg)](https://youtu.be/2F2NlaBmnTg)

## Requirements

- Windows 10/11 for the packaged `.exe` workflow.
- Node.js 22.x is currently used in this project environment.
- npm.
- A WhatsApp account that can scan the QR code.
- Internet access for WhatsApp Web and for `npm install`.

## Install

```powershell
npm.cmd install
```

If dependencies look broken after a branch update, remove `node_modules` and run `npm.cmd install` again. Do not use `npm audit fix --force` blindly because it may upgrade packages with breaking changes.

## Environment Configuration

Copy the example file for local development:

```powershell
Copy-Item .env.example .env
```

Important variables:

```env
SESSION_NAME=employee-session
MESSAGE_DELAY_MIN=10000
MESSAGE_DELAY_MAX=20000
BATCH_SIZE=5
BATCH_PAUSE=30000
MEDIA_RETRY_ATTEMPTS=3
MEDIA_RETRY_DELAY=15000
PHONE_COLUMN=phone
```

Timing values are milliseconds. Contact files can use a `phone` column or a `NUMBERS` column.

The packaged app does not include `.env`. In the installed app, runtime settings are stored in:

```text
%APPDATA%\WhatsApp Broadcast Sender\settings.json
```

## Run In Development

Start the Electron GUI:

```powershell
npm.cmd start
```

Optional CLI entry point:

```powershell
npm.cmd run cli
```

The GUI is the supported path for internal users.

## Build Windows Installer

```powershell
npm.cmd run build:win
```

Build output:

```text
release\WhatsApp Broadcast Sender Setup 1.0.0.exe
release\win-unpacked\
```

The app is currently not code-signed, so Windows may show a SmartScreen or publisher warning. That is expected for this internal build.

## Runtime Storage

Development mode stores runtime files in the project folder:

```text
settings.json
logs\
data\saved-contacts\
tokens\
```

Packaged app stores runtime files in the user's writable app data folder:

```text
%APPDATA%\WhatsApp Broadcast Sender\settings.json
%APPDATA%\WhatsApp Broadcast Sender\logs\
%APPDATA%\WhatsApp Broadcast Sender\data\saved-contacts\
%APPDATA%\WhatsApp Broadcast Sender\tokens\
```

`tokens\` contains WhatsApp/WPPConnect session data. Deleting it logs the app out and requires scanning the QR code again.

## Logs And Retry Files

Normal logs are written to `logs\`:

```text
send-log-YYYY-MM-DD_HH-MM-SS.json
success-YYYY-MM-DD_HH-MM-SS.csv
failed-YYYY-MM-DD_HH-MM-SS.csv
```

Normal logs keep operational fields such as timestamp, row number, contact ID, phone, status, error reason, media flag, and media type. They do not store full generated messages or full contact rows.

Retry data is written separately:

```text
retry-failed-YYYY-MM-DD_HH-MM-SS.csv
```

The retry file contains the original failed contact rows because Retry Failed needs the original fields to regenerate personalized messages. Treat retry files as sensitive.

## Common Problems

- `Contacts file must contain a 'phone' column`: use a `phone` or `NUMBERS` column in the spreadsheet.
- WhatsApp asks for QR again: token data may be missing or moved. Scan the QR code again.
- Invalid media blocks sending: choose a supported `.jpg`, `.jpeg`, `.png`, `.pdf`, or `.mp4` file, or remove the selected media.
- Build warns about missing app icon: packaging still completes, but the default Electron icon is used.
- `Cannot find module './keywords'` during build: dependencies are inconsistent. Run `npm.cmd install`; if needed, reinstall `node_modules` cleanly.
- `npm audit` reports vulnerabilities: review before changing dependency versions. Do not force upgrades without testing Electron, WPPConnect, and packaging.

## Manual Test Checklist

Before sharing an internal build:

1. Run `npm.cmd install` on a clean checkout or updated workspace.
2. Run `npm.cmd start` and confirm the Electron window opens.
3. Confirm Sender and Contacts tabs open.
4. Load a contact spreadsheet with `phone` or `NUMBERS`.
5. Save/edit the message template and restart the app to confirm settings persist.
6. Connect WhatsApp and scan the QR code if required.
7. Run a small text-only send to 1-2 test contacts.
8. Run a small valid-media send with a supported file.
9. Try an invalid/deleted media file and confirm sending is blocked.
10. Open logs and confirm normal logs do not include full generated messages or full contact rows.
11. Confirm Retry Failed loads failed contacts from `retry-failed-*.csv`.
12. Run Clean Logs and confirm success, failed, retry, and send logs are removed.
13. Run `npm.cmd run build:win`.
14. Install `release\WhatsApp Broadcast Sender Setup 1.0.0.exe`.
15. Launch from the desktop/start menu shortcut and repeat a small smoke test.

## Notes For Future Developers And AI Assistants

- Keep app logic separate from documentation changes.
- Do not commit `.env`, `tokens\`, `logs\`, `data\`, `media\`, or `release\`.
- The packaged app should write user data only under Electron `app.getPath("userData")`.
- Normal logs intentionally avoid message bodies and full contact rows, but phone numbers are stored as requested.
- Retry files are intentionally more sensitive than normal logs because retry requires original contact fields.
