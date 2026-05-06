const wppconnect = require("@wppconnect-team/wppconnect");

async function waitUntilReady(client) {
  console.log("Waiting for WhatsApp to be fully ready...");

  const startTime = Date.now();

  // 5 minutes timeout
  const timeout = 5 * 60 * 1000;

  while (true) {
    try {
      const state = await client.getConnectionState();

      console.log("WhatsApp state:", state);

      if (state === "CONNECTED") {
        console.log("WhatsApp is ready.");
        return true;
      }

      // timeout protection
      if (Date.now() - startTime > timeout) {
        throw new Error("Timeout waiting for WhatsApp connection.");
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.log("Error checking connection:", error.message);

      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function createClient(sessionName) {
  const client = await wppconnect.create({
    session: sessionName,
    catchQR: (base64Qr, asciiQR) => {
      console.log("Scan this QR code with WhatsApp:");
      console.log(asciiQR);
    },
    statusFind: (statusSession) => {
      console.log("Session status:", statusSession);
    },
    headless: true,
    devtools: false,
    useChrome: true,
    debug: false,
    logQR: true
  });

  await waitUntilReady(client);

  return client;
}

module.exports = { createClient };