const { Api } = require("telegram");

const {
  resolveTelegramRecipient
} = require("./telegramRecipient");

async function resolveTelegramSendRecipient(
  client,
  contact = {}
) {

  const recipient =
    resolveTelegramRecipient(contact);

  if (
    !recipient.valid ||
    recipient.recipientType !== "phone"
  ) {

    return recipient;
  }

  if (
    !client ||
    typeof client.invoke !== "function"
  ) {

    return {
      ...recipient,
      valid: false,
      diagnostics: {
        ...recipient.diagnostics,
        lookupStatus:
          "client_not_available"
      },
      reason:
        "Telegram phone lookup requires an active Telegram client."
    };
  }

  try {

    const resolution =
      await resolveTelegramPhone(
        client,
        recipient.phone,
        contact
      );

    return {
      ...recipient,
      chatId:
        resolution.chatId,
      diagnostics: {
        ...recipient.diagnostics,
        lookupMethod:
          resolution.lookupMethod,
        lookupStatus:
          "resolved",
        resolvedTarget:
          resolution.resolvedTarget
      }
    };

  } catch (error) {

    return {
      ...recipient,
      valid: false,
      diagnostics: {
        ...recipient.diagnostics,
        lookupMethod:
          error.lookupMethod ||
          "contacts.ResolvePhone + contacts.ImportContacts",
        lookupStatus:
          error.lookupStatus ||
          "lookup_failed"
      },
      reason:
        error.message
    };
  }
}

async function resolveTelegramPhone(
  client,
  phone,
  contact = {}
) {

  const normalizedPhone =
    String(phone || "").replace(/^\+/, "");

  const resolvedPeer =
    await tryResolvePhone(
      client,
      normalizedPhone
    );

  const resolvedUser =
    getFirstUser(resolvedPeer);

  if (resolvedUser) {

    return {
      chatId:
        resolvedUser,
      lookupMethod:
        "contacts.ResolvePhone",
      resolvedTarget:
        getTelegramUserLabel(resolvedUser)
    };
  }

  const importedContacts =
    await importPhoneContact(
      client,
      normalizedPhone,
      contact
    );

  const importedUser =
    getImportedUser(importedContacts);

  if (importedUser) {

    return {
      chatId:
        importedUser,
      lookupMethod:
        "contacts.ImportContacts",
      resolvedTarget:
        getTelegramUserLabel(importedUser)
    };
  }

  const error =
    new Error(
      "Telegram user not found for phone number. It may not be registered, visible by phone, or discoverable by this Telegram account."
    );

  error.lookupMethod =
    "contacts.ResolvePhone + contacts.ImportContacts";

  error.lookupStatus =
    "not_found_or_not_discoverable";

  throw error;
}

async function tryResolvePhone(client, phone) {

  try {

    return await client.invoke(
      new Api.contacts.ResolvePhone({
        phone
      })
    );

  } catch (error) {

    return null;
  }
}

async function importPhoneContact(
  client,
  phone,
  contact
) {

  return client.invoke(
    new Api.contacts.ImportContacts({
      contacts: [
        new Api.InputPhoneContact({
          clientId:
            Date.now(),
          phone:
            `+${phone}`,
          firstName:
            getContactFirstName(contact),
          lastName:
            ""
        })
      ]
    })
  );
}

function getTelegramUserLabel(user) {

  if (!user) {

    return "";
  }

  if (user.username) {

    return `@${user.username}`;
  }

  if (user.id) {

    return `id:${String(user.id)}`;
  }

  return "Telegram user";
}

function getUsers(result) {

  return Array.isArray(result?.users)
    ? result.users
    : [];
}

function getImportedContacts(result) {

  return Array.isArray(result?.imported)
    ? result.imported
    : [];
}

function getFirstUser(result) {

  const users =
    getUsers(result);

  if (users.length === 0) {

    return null;
  }

  return users[0];
}

function getImportedUser(result) {

  const firstUser =
    getFirstUser(result);

  const imported =
    getImportedContacts(result);

  const users =
    getUsers(result);

  if (imported.length === 0) {

    return firstUser;
  }

  const importedUserId =
    String(imported[0].userId);

  return users.find(user => {

    return String(user.id) === importedUserId;
  }) || firstUser;
}

function getContactFirstName(contact = {}) {

  const keys = [
    "name",
    "Name",
    "first_name",
    "First Name",
    "full_name",
    "Full Name"
  ];

  const key =
    keys.find(candidate => {

      return Object.prototype.hasOwnProperty.call(
        contact,
        candidate
      );
    });

  const value =
    key
      ? String(contact[key] ?? "").trim()
      : "";

  return value || "Telegram Contact";
}

module.exports = {
  resolveTelegramPhone,
  resolveTelegramSendRecipient
};
