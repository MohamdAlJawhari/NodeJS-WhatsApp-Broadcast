const MESSAGING_PROVIDERS = {
  TELEGRAM: "telegram",
  WHATSAPP: "whatsapp"
};

function normalizeMessagingProvider(provider) {

  const normalized =
    String(provider || "")
      .trim()
      .toLowerCase();

  if (!normalized) {

    return MESSAGING_PROVIDERS.WHATSAPP;
  }

  if (normalized === MESSAGING_PROVIDERS.TELEGRAM) {

    return MESSAGING_PROVIDERS.TELEGRAM;
  }

  if (normalized === MESSAGING_PROVIDERS.WHATSAPP) {

    return MESSAGING_PROVIDERS.WHATSAPP;
  }

  throw new Error(
    `Unsupported messaging provider: ${provider}`
  );
}

module.exports = {
  MESSAGING_PROVIDERS,
  normalizeMessagingProvider
};
