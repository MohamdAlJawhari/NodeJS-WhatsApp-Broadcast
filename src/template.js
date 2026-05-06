// to generate personalized messages based on a template and contact data.
function generateMessage(template, contact) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const cleanKey = key.trim();
    return contact[cleanKey] ?? "";
  });
}

module.exports = { generateMessage };