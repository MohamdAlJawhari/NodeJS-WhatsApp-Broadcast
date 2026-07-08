const assert = require("node:assert/strict");
const test = require("node:test");

const {
  REDACTED,
  REDACTED_CONTACT,
  REDACTED_PHONE,
  redactContactRow,
  redactSensitiveObject,
  redactSensitiveText,
  redactSensitiveValue
} = require("../src/security/redaction");
const {
  createContactLogEntry,
  formatLogPhone,
  getRecipientDiagnosticLines
} = require("../src/broadcast/logging");

test(
  "redaction removes phone-like values and secret assignments from text",
  () => {

    const redacted =
      redactSensitiveText(
        "Send to +15555550123 with password=fake-pass and token=fake-token"
      );

    assert.match(redacted, /\[REDACTED_PHONE\]/);
    assert.match(redacted, /password=\[REDACTED\]/);
    assert.match(redacted, /token=\[REDACTED\]/);
    assert.doesNotMatch(redacted, /15555550123/);
    assert.doesNotMatch(redacted, /fake-pass/);
    assert.doesNotMatch(redacted, /fake-token/);
  }
);

test(
  "redaction can preserve phone-like values while removing secrets",
  () => {

    const redacted =
      redactSensitiveText(
        "Send to +15555550123 with token=fake-token",
        {
          redactPhoneLike: false
        }
      );

    assert.match(redacted, /\+15555550123/);
    assert.match(redacted, /token=\[REDACTED\]/);
    assert.doesNotMatch(redacted, /fake-token/);
  }
);

test(
  "redaction removes sensitive keyed values and contact rows",
  () => {

    assert.equal(
      redactSensitiveValue(
        "fake-token",
        "telegram_token"
      ),
      REDACTED
    );

    assert.deepEqual(
      redactContactRow({
        name: "Example User",
        phone: "+15555550123",
        password: "fake-pass",
        note: ""
      }),
      {
        name: REDACTED_CONTACT,
        phone: REDACTED_CONTACT,
        password: REDACTED_CONTACT,
        note: ""
      }
    );
  }
);

test(
  "structured redaction removes sensitive object fields",
  () => {

    const redacted =
      redactSensitiveObject({
        name: "Example User",
        phone: "+15555550123",
        nested: {
          token: "fake-token",
          status: "failed for +15555550123",
          count: 2
        }
      });

    assert.equal(redacted.name, REDACTED);
    assert.equal(redacted.phone, REDACTED);
    assert.equal(redacted.nested.token, REDACTED);
    assert.equal(redacted.nested.count, 2);
    assert.match(
      redacted.nested.status,
      /\[REDACTED_PHONE\]/
    );
    assert.doesNotMatch(
      JSON.stringify(redacted),
      /Example User|15555550123|fake-token/
    );
  }
);

test(
  "sender log helpers redact recipients before console or CSV output",
  () => {

    assert.equal(
      formatLogPhone("+15555550123"),
      REDACTED_PHONE
    );

    assert.equal(
      formatLogPhone("example_username"),
      REDACTED_CONTACT
    );
  }
);

test(
  "contact log entries redact contact identifiers and diagnostics",
  () => {

    const entry =
      createContactLogEntry({
        contact: {
          id: "fake-contact-id",
          name: "Example User"
        },
        index: 0,
        rawPhone: "+15555550123",
        recipient: {
          diagnostics: {
            source: "phone",
            column: "NUMBERS",
            originalValue: "+15555550123",
            normalizedPhone: "15555550123",
            resolvedTarget: "+15555550123",
            lookupStatus: "found token=fake-token"
          }
        },
        status: "failed",
        error:
          "password=fake-pass while sending to +15555550123"
      });

    const serialized =
      JSON.stringify(entry);

    assert.equal(entry.contactId, REDACTED_CONTACT);
    assert.equal(entry.phone, REDACTED_PHONE);
    assert.match(entry.recipientDetails, /\[REDACTED_PHONE\]/);
    assert.match(entry.recipientDetails, /token=\[REDACTED\]/);
    assert.match(entry.error, /password=\[REDACTED\]/);
    assert.doesNotMatch(serialized, /15555550123/);
    assert.doesNotMatch(serialized, /fake-token/);
    assert.doesNotMatch(serialized, /fake-pass/);
    assert.doesNotMatch(serialized, /fake-contact-id/);
  }
);

test(
  "recipient diagnostic console lines redact resolved targets",
  () => {

    const lines =
      getRecipientDiagnosticLines({
        diagnostics: {
          source: "telegram",
          column: "@USERNAME",
          originalValue: "example_username",
          resolvedTarget: {
            username: "example_username"
          }
        }
      });

    const serialized =
      lines.join("\n");

    assert.match(serialized, /\[REDACTED_CONTACT\]/);
    assert.doesNotMatch(serialized, /example_username/);
  }
);

test(
  "recipient diagnostic lines can preserve live recipient values",
  () => {

    const lines =
      getRecipientDiagnosticLines(
        {
          diagnostics: {
            source: "username",
            column: "@USERNAME",
            originalValue: "example_username",
            normalizedPhone: "+15555550123",
            resolvedTarget: {
              username: "example_username"
            },
            lookupStatus: "found token=fake-token"
          }
        },
        {
          redactRecipientValues: false
        }
      );

    const serialized =
      lines.join("\n");

    assert.match(serialized, /example_username/);
    assert.match(serialized, /@example_username/);
    assert.match(serialized, /\+15555550123/);
    assert.match(serialized, /token=\[REDACTED\]/);
    assert.doesNotMatch(serialized, /fake-token/);
  }
);
