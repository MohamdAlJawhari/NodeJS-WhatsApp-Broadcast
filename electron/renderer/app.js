const loadBtn =
  document.getElementById(
    "loadContactsBtn"
  );

const status =
  document.getElementById(
    "status"
  );

const previewBtn =
  document.getElementById(
    "previewBtn"
  );

const templateInput =
  document.getElementById(
    "templateInput"
  );

const previewContainer =
  document.getElementById(
    "previewContainer"
  );

let contacts = [];

loadBtn.addEventListener(
  "click",
  async () => {

    status.innerText =
      "Loading contacts...";

    const result =
      await window.electronAPI
        .selectContactsFile();

    if (!result.success) {

      status.innerText =
        result.error ||
        "File selection canceled";

      return;
    }

    contacts = result.contacts;

    status.innerText =
      `Loaded ${result.count} contacts`;
  }
);

previewBtn.addEventListener(
  "click",
  async () => {

    if (contacts.length === 0) {

      alert(
        "Load contacts first"
      );

      return;
    }

    const template =
      templateInput.value;

    const preview =
      await window.electronAPI
        .generatePreview({

          contacts,
          template
        });

    previewContainer.innerHTML =
      "";

    preview.forEach(item => {

      const div =
        document.createElement("div");

      div.className =
        "preview-card";

      div.innerHTML = `
        <strong>
          ${item.phone}
        </strong>

        <p>
          ${item.message}
        </p>
      `;

      previewContainer.appendChild(
        div
      );
    });
  }
);