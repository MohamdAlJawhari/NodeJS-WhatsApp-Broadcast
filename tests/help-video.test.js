const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getHelpVideoConfig
} = require("../electron/main/ipcHandlers");

test("help video config creates a YouTube thumbnail", () => {
  assert.deepEqual(
    getHelpVideoConfig(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    ),
    {
      url:
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl:
        "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    }
  );
});

test("help video config accepts short YouTube URLs", () => {
  const config =
    getHelpVideoConfig(
      "https://youtu.be/dQw4w9WgXcQ"
    );

  assert.equal(
    config.thumbnailUrl,
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  );
});

test("help video config rejects unsafe and unrelated URLs", () => {
  assert.deepEqual(
    getHelpVideoConfig("javascript:alert(1)"),
    { url: "", thumbnailUrl: "" }
  );
  assert.deepEqual(
    getHelpVideoConfig("https://example.com/video"),
    { url: "", thumbnailUrl: "" }
  );
});
