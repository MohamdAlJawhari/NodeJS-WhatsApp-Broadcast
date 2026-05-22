const DEFAULT_PHONE_COLUMN = "phone";

const PHONE_COLUMN_ALIASES = [
  "phone",
  "NUMBERS"
];

function normalizeColumnName(columnName) {
  return String(columnName || "")
    .trim()
    .toLowerCase();
}

function getConfiguredPhoneColumn() {
  const configured =
    process.env.PHONE_COLUMN ||
    DEFAULT_PHONE_COLUMN;

  return String(configured).trim() ||
    DEFAULT_PHONE_COLUMN;
}

function getPhoneColumnCandidates() {
  const candidates = [
    getConfiguredPhoneColumn(),
    ...PHONE_COLUMN_ALIASES
  ];

  const seen = new Set();

  return candidates.filter(candidate => {
    const normalized =
      normalizeColumnName(candidate);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function findPhoneColumn(headers) {
  const columns =
    Array.isArray(headers)
      ? headers
      : [];

  for (const candidate of getPhoneColumnCandidates()) {
    const normalizedCandidate =
      normalizeColumnName(candidate);

    const match = columns.find(header => {
      return normalizeColumnName(header) ===
        normalizedCandidate;
    });

    if (match) {
      return String(match).trim();
    }
  }

  return null;
}

function getPhoneValue(contact) {
  if (!contact || typeof contact !== "object") {
    return undefined;
  }

  const configuredColumn =
    getConfiguredPhoneColumn();

  if (
    Object.prototype.hasOwnProperty.call(
      contact,
      configuredColumn
    )
  ) {
    return contact[configuredColumn];
  }

  const actualColumn =
    findPhoneColumn(Object.keys(contact));

  return actualColumn
    ? contact[actualColumn]
    : undefined;
}

function getPhoneColumnRequirementLabel() {
  return getPhoneColumnCandidates()
    .map(column => `'${column}'`)
    .join(" or ");
}

module.exports = {
  findPhoneColumn,
  getConfiguredPhoneColumn,
  getPhoneColumnCandidates,
  getPhoneColumnRequirementLabel,
  getPhoneValue
};
