function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, "");
  return `${cleaned}@c.us`;
}

module.exports = {
  sleep,
  randomDelay,
  formatPhone
};