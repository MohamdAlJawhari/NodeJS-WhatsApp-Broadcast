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
      reason:
        "Telegram phone lookup requires an active Telegram client."
    };
  }

  try {

    const chatId =
      await resolveTelegramPhone(
        client,
        recipient.phone,
        contact
      );

    return {
      ...recipient,
      chatId
    };

  } catch (error) {

    return {
      ...recipient,
      valid: false,
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

    return resolvedUser;
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

    return importedUser;
  }

  throw new Error(
    "Telegram user not found for phone number."
  );
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

function getFirstUser(result) {

  if (
    !result ||
    !Array.isArray(result.users) ||
    result.users.length === 0
  ) {

    return null;
  }

  return result.users[0];
}

function getImportedUser(result) {

  const firstUser =
    getFirstUser(result);

  if (
    !result ||
    !Array.isArray(result.imported) ||
    result.imported.length === 0
  ) {

    return firstUser;
  }

  const importedUserId =
    String(result.imported[0].userId);

  return result.users.find(user => {

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
