# Telegram Contact File Format

Use these columns for Telegram broadcasts:

```csv
name,NUMBERS,@USERNAME,TELEGRAM_TO
Ali,+96181744432,,
Maya,,@maya_username,
Test User,,,me
```

Recipient priority:

1. `TELEGRAM_TO`
2. `@USERNAME`
3. `NUMBERS` or `phone`

Column meanings:

- `NUMBERS`: normal phone number column. Use this for most employees.
- `@USERNAME`: Telegram username, such as `@maya_username`. The app also accepts `maya_username`.
- `TELEGRAM_TO`: special direct Telegram target. Use it only for values such as `me`, `@username`, or a numeric Telegram ID.

Keep old files working:

- `telegram_recipient` still works as an alias for `TELEGRAM_TO`.
- `telegram_username` still works as an alias for `@USERNAME`.

Recommended employee file:

```csv
name,NUMBERS,@USERNAME,TELEGRAM_TO
Employee Name,+961XXXXXXXX,,
Employee With Username,,@username,
```
