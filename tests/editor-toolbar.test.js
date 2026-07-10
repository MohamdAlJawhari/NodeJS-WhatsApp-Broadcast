const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createClassList(
  initialClasses = []
) {
  const classes =
    new Set(initialClasses);

  return {
    add: (...classNames) => {
      classNames.forEach(className => {
        classes.add(className);
      });
    },
    contains: (className) => {
      return classes.has(className);
    },
    remove: (...classNames) => {
      classNames.forEach(className => {
        classes.delete(className);
      });
    },
    toggle: (className, force) => {
      const shouldAdd =
        force === undefined
          ? !classes.has(className)
          : Boolean(force);

      if (shouldAdd) {
        classes.add(className);
      } else {
        classes.delete(className);
      }

      return shouldAdd;
    }
  };
}

function createElement(
  initialClasses = []
) {
  const listeners = {};

  return {
    classList:
      createClassList(
        initialClasses
      ),
    dataset: {},
    innerHTML: "",
    innerText: "",
    value: "",
    addEventListener: (eventName, listener) => {
      listeners[eventName] =
        listener;
    },
    clickTarget(target) {
      if (listeners.click) {
        listeners.click({
          target
        });
      }
    },
    dispatchEvent: (event) => {
      if (listeners[event.type]) {
        listeners[event.type](event);
      }
    },
    focus: () => {},
    getBoundingClientRect: () => {
      return {
        bottom: 48,
        height: 260,
        left: 16,
        top: 10,
        width: 280
      };
    },
    select: () => {},
    setAttribute(
      name,
      value
    ) {
      this[name] =
        value;
    },
    style: {}
  };
}

function loadEditorToolbarFactory({
  alignmentOptionButtons = [],
  commandButtons = [],
  confirm,
  dropdownTriggers = [],
  emojiButtons = [],
  emojiSelects = [],
  menuElements = [],
  prompt,
  templateButtons = [],
  variableSelects = [],
  alignmentControls = []
} = {}) {
  const scriptPath =
    path.join(
      __dirname,
      "..",
      "electron",
      "renderer",
      "app",
      "editorToolbar.js"
    );

  const sandbox = {
    Event: class {
      constructor(
        type,
        options
      ) {
        this.type =
          type;
        this.bubbles =
          Boolean(options && options.bubbles);
      }
    },
    document: {
      querySelectorAll: (selector) => {
        if (selector === "[data-editor-command]") {
          return commandButtons;
        }

        if (selector === "[data-editor-dropdown]") {
          return dropdownTriggers;
        }

        if (selector === "[data-template-insert]") {
          return templateButtons;
        }

        if (selector === "[data-emoji-insert]") {
          return emojiButtons;
        }

        if (selector === "[data-emoji-select]") {
          return emojiSelects;
        }

        if (selector === "[data-variable-select]") {
          return variableSelects;
        }

        if (selector === "[data-editor-align]") {
          return alignmentControls;
        }

        if (selector === "[data-editor-align-option]") {
          return alignmentOptionButtons;
        }

        if (selector === ".toolbar-menu") {
          return menuElements;
        }

        return [];
      },
      addEventListener: () => {
      }
    },
    window: {
      confirm,
      prompt
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(scriptPath, "utf8"),
    sandbox,
    {
      filename: scriptPath
    }
  );

  return sandbox
    .window
    .BroadcastRendererEditorToolbar
    .createEditorToolbar;
}

function createButton(
  dataset
) {
  const listeners = {};

  return {
    classList:
      createClassList(),
    dataset,
    addEventListener: (eventName, listener) => {
      listeners[eventName] =
        listener;
    },
    click: () => {
      listeners.click({
        preventDefault: () => {},
        stopPropagation: () => {}
      });
    },
    closest: () => null,
    getBoundingClientRect: () => {
      return {
        bottom: 48,
        height: 38,
        left: 16,
        top: 10,
        width: 38
      };
    },
    setAttribute(
      name,
      value
    ) {
      this[name] =
        value;
    }
  };
}

function createSelect(
  value
) {
  const listeners = {};

  return {
    value,
    addEventListener: (eventName, listener) => {
      listeners[eventName] =
        listener;
    },
    change(nextValue) {
      this.value =
        nextValue;
      listeners.change();
    }
  };
}

function createInput({
  value,
  selectionStart,
  selectionEnd
}) {
  const listeners = {};

  return {
    classList:
      createClassList(),
    value,
    selectionStart,
    selectionEnd,
    style: {},
    addEventListener: (eventName, listener) => {
      listeners[eventName] =
        listener;
    },
    dispatchEvent: (event) => {
      if (listeners[event.type]) {
        listeners[event.type](event);
      }
    },
    focus: () => {},
    keydown: (event) => {
      listeners.keydown(event);
    },
    setSelectionRange(
      start,
      end
    ) {
      this.selectionStart =
        start;
      this.selectionEnd =
        end;
    }
  };
}

function createToolbarScenario({
  alignmentDropdownMenu,
  alignmentOptionButtons,
  command,
  commandButtons,
  confirm,
  dropdownTriggers,
  emojiDropdownMenu,
  emojiButtons,
  emojiSelects,
  linkApplyBtn,
  linkCancelBtn,
  linkDropdownMenu,
  linkUrlInput,
  menuElements,
  prompt,
  templateButtons,
  variableDropdownMenu,
  variableSelects,
  alignmentControls,
  value,
  selectionStart,
  selectionEnd
}) {
  const buttons =
    commandButtons ||
    [
      createButton({
        editorCommand:
          command
      })
    ];

  const input =
    createInput({
      value,
      selectionStart,
      selectionEnd
    });

  const templatePreview =
    createElement();

  const templatePreviewToggle =
    createElement();

  const templatesPanel =
    createElement();

  const createEditorToolbar =
    loadEditorToolbarFactory({
      alignmentOptionButtons,
      alignmentControls,
      commandButtons:
        buttons,
      confirm,
      dropdownTriggers,
      emojiButtons,
      emojiSelects,
      menuElements,
      prompt,
      templateButtons,
      variableSelects
    });

  createEditorToolbar({
    dom: {
      alignmentDropdownMenu,
      emojiDropdownMenu,
      linkApplyBtn,
      linkCancelBtn,
      linkDropdownMenu,
      linkUrlInput,
      templateCharCount:
        createElement(),
      templateInput:
        input,
      templatePreview,
      templatePreviewToggle,
      templatesPanel,
      variableDropdownMenu
    }
  }).register();

  return {
    alignmentDropdownMenu,
    buttons,
    emojiDropdownMenu,
    input,
    linkApplyBtn,
    linkCancelBtn,
    linkDropdownMenu,
    linkUrlInput,
    templatePreview,
    templatePreviewToggle,
    templatesPanel,
    variableDropdownMenu
  };
}

test(
  "editor formatting keeps a double-click trailing space outside markers",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "italic",
        value:
          "test test test test",
        selectionStart:
          5,
        selectionEnd:
          10
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.value,
      "test _test_ test test"
    );
    assert.equal(
      scenario.input.selectionStart,
      6
    );
    assert.equal(
      scenario.input.selectionEnd,
      10
    );
  }
);

test(
  "editor formatting keeps leading and trailing spaces outside markers",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "bold",
        value:
          "alpha  beta  gamma",
        selectionStart:
          5,
        selectionEnd:
          13
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.value,
      "alpha  *beta*  gamma"
    );
    assert.equal(
      scenario.input.selectionStart,
      8
    );
    assert.equal(
      scenario.input.selectionEnd,
      12
    );
  }
);

test(
  "editor toolbar supports underline markers and preserves selection",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "underline",
        value:
          "hello world",
        selectionStart:
          6,
        selectionEnd:
          11
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.value,
      "hello __world__"
    );
    assert.equal(
      scenario.input.selectionStart,
      8
    );
    assert.equal(
      scenario.input.selectionEnd,
      13
    );
  }
);

test(
  "editor toolbar supports strikethrough markers",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "strikethrough",
        value:
          "hello world",
        selectionStart:
          6,
        selectionEnd:
          11
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.value,
      "hello ~world~"
    );
    assert.equal(
      scenario.input.selectionStart,
      7
    );
    assert.equal(
      scenario.input.selectionEnd,
      12
    );
  }
);

test(
  "editor toolbar inserts links and preserves selected link text",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "link",
        prompt: () => "https://example.com",
        value:
          "visit site",
        selectionStart:
          6,
        selectionEnd:
          10
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.value,
      "visit [site](https://example.com)"
    );
    assert.equal(
      scenario.input.selectionStart,
      7
    );
    assert.equal(
      scenario.input.selectionEnd,
      11
    );
  }
);

test(
  "editor toolbar inserts links from the in-app popover",
  () => {
    const linkButton =
      createButton({
        editorCommand:
          "link"
      });

    const linkApplyBtn =
      createButton({});

    const linkUrlInput =
      createElement();

    const scenario =
      createToolbarScenario({
        commandButtons: [
          linkButton
        ],
        linkApplyBtn,
        linkDropdownMenu:
          createElement([
            "hidden"
          ]),
        linkUrlInput,
        value:
          "visit site",
        selectionStart:
          6,
        selectionEnd:
          10
      });

    linkButton.click();

    assert.equal(
      scenario.linkDropdownMenu.classList.contains("hidden"),
      false
    );
    assert.equal(
      linkButton["aria-expanded"],
      "true"
    );
    assert.equal(
      scenario.linkUrlInput.value,
      "https://"
    );

    scenario.linkUrlInput.value =
      "https://example.com";

    scenario.linkApplyBtn.click();

    assert.equal(
      scenario.input.value,
      "visit [site](https://example.com)"
    );
    assert.equal(
      scenario.input.selectionStart,
      7
    );
    assert.equal(
      scenario.input.selectionEnd,
      11
    );
    assert.equal(
      scenario.linkDropdownMenu.classList.contains("hidden"),
      true
    );
  }
);

test(
  "editor toolbar inserts emoji and keeps cursor after the emoji",
  () => {
    const emojiSelect =
      createSelect("");

    const scenario =
      createToolbarScenario({
        commandButtons: [],
        emojiSelects: [
          emojiSelect
        ],
        value:
          "Done ",
        selectionStart:
          5,
        selectionEnd:
          5
      });

    emojiSelect.change("✅");

    assert.equal(
      scenario.input.value,
      "Done ✅"
    );
    assert.equal(
      scenario.input.selectionStart,
      6
    );
    assert.equal(
      scenario.input.selectionEnd,
      6
    );
    assert.equal(
      emojiSelect.value,
      ""
    );
  }
);

test(
  "editor toolbar generates emoji dropdown items without hardcoded markup",
  () => {
    const emojiDropdownMenu =
      createElement([
        "hidden"
      ]);

    const scenario =
      createToolbarScenario({
        commandButtons: [],
        emojiDropdownMenu,
        value:
          "Done ",
        selectionStart:
          5,
        selectionEnd:
          5
      });

    assert.match(
      emojiDropdownMenu.innerHTML,
      /data-emoji-insert="😀"/
    );

    scenario.emojiDropdownMenu.clickTarget({
      dataset: {
        emojiInsert:
          "✅"
      }
    });

    assert.equal(
      scenario.input.value,
      "Done ✅"
    );
    assert.equal(
      scenario.input.selectionStart,
      6
    );
    assert.equal(
      scenario.input.selectionEnd,
      6
    );
  }
);

test(
  "editor toolbar inserts variables from dropdown controls",
  () => {
    const variableButton =
      createButton({
        templateInsert:
          "{{company}}"
      });

    const scenario =
      createToolbarScenario({
        commandButtons: [],
        templateButtons: [
          variableButton
        ],
        variableDropdownMenu:
          createElement([
            "hidden"
          ]),
        value:
          "Hello ",
        selectionStart:
          6,
        selectionEnd:
          6
      });

    variableButton.click();

    assert.equal(
      scenario.input.value,
      "Hello {{company}}"
    );
    assert.equal(
      scenario.input.selectionStart,
      17
    );
    assert.equal(
      scenario.input.selectionEnd,
      17
    );
  }
);

test(
  "editor toolbar keeps legacy variable selects working",
  () => {
    const variableSelect =
      createSelect("");

    const scenario =
      createToolbarScenario({
        commandButtons: [],
        variableSelects: [
          variableSelect
        ],
        value:
          "Hello ",
        selectionStart:
          6,
        selectionEnd:
          6
      });

    variableSelect.change("{{company}}");

    assert.equal(
      scenario.input.value,
      "Hello {{company}}"
    );
    assert.equal(
      scenario.input.selectionStart,
      17
    );
    assert.equal(
      scenario.input.selectionEnd,
      17
    );
    assert.equal(
      variableSelect.value,
      ""
    );
  }
);

test(
  "editor toolbar opens dropdown panels without changing selection",
  () => {
    const emojiTrigger =
      createButton({
        editorDropdown:
          "emoji"
      });

    const emojiDropdownMenu =
      createElement([
        "hidden"
      ]);

    const scenario =
      createToolbarScenario({
        commandButtons: [],
        dropdownTriggers: [
          emojiTrigger
        ],
        emojiDropdownMenu,
        value:
          "Hello",
        selectionStart:
          2,
        selectionEnd:
          4
      });

    emojiTrigger.click();

    assert.equal(
      scenario.emojiDropdownMenu.classList.contains("hidden"),
      false
    );
    assert.equal(
      emojiTrigger["aria-expanded"],
      "true"
    );
    assert.equal(
      scenario.input.selectionStart,
      2
    );
    assert.equal(
      scenario.input.selectionEnd,
      4
    );
  }
);

test(
  "editor toolbar changes alignment from the custom dropdown",
  () => {
    const centerOption =
      createButton({
        editorAlignOption:
          "center"
      });

    const startOption =
      createButton({
        editorAlignOption:
          "start"
      });

    const scenario =
      createToolbarScenario({
        alignmentDropdownMenu:
          createElement([
            "hidden"
          ]),
        alignmentOptionButtons: [
          startOption,
          centerOption
        ],
        commandButtons: [],
        value:
          "hello",
        selectionStart:
          1,
        selectionEnd:
          4
      });

    centerOption.click();

    assert.equal(
      scenario.templatesPanel.dataset.editorAlign,
      "center"
    );
    assert.equal(
      scenario.input.style.textAlign,
      "center"
    );
    assert.equal(
      scenario.templatePreview.style.textAlign,
      "center"
    );
    assert.equal(
      centerOption["aria-checked"],
      "true"
    );
    assert.equal(
      startOption["aria-checked"],
      "false"
    );
    assert.equal(
      scenario.input.selectionStart,
      1
    );
    assert.equal(
      scenario.input.selectionEnd,
      4
    );
  }
);

test(
  "editor toolbar creates bulleted and numbered lists with stable selection",
  () => {
    const bulletButton =
      createButton({
        editorCommand:
          "bullet-list"
      });

    const numberedButton =
      createButton({
        editorCommand:
          "numbered-list"
      });

    const bulletScenario =
      createToolbarScenario({
        commandButtons: [
          bulletButton
        ],
        value:
          "one\ntwo",
        selectionStart:
          0,
        selectionEnd:
          7
      });

    bulletButton.click();

    assert.equal(
      bulletScenario.input.value,
      "- one\n- two"
    );
    assert.equal(
      bulletScenario.input.selectionStart,
      0
    );
    assert.equal(
      bulletScenario.input.selectionEnd,
      11
    );

    const numberedScenario =
      createToolbarScenario({
        commandButtons: [
          numberedButton
        ],
        value:
          "one\ntwo",
        selectionStart:
          0,
        selectionEnd:
          7
      });

    numberedButton.click();

    assert.equal(
      numberedScenario.input.value,
      "1. one\n2. two"
    );
    assert.equal(
      numberedScenario.input.selectionStart,
      0
    );
    assert.equal(
      numberedScenario.input.selectionEnd,
      13
    );
  }
);

test(
  "editor toolbar clears common message formatting",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "clear-formatting",
        value:
          "*Bold* _italic_ __under__ ~old~ [site](https://example.com)\n- one\n1. two",
        selectionStart:
          0,
        selectionEnd:
          76
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.value,
      "Bold italic under old site\none\ntwo"
    );
    assert.equal(
      scenario.input.selectionStart,
      0
    );
    assert.equal(
      scenario.input.selectionEnd,
      34
    );
  }
);

test(
  "editor toolbar confirms before clearing formatting across the full message",
  () => {
    let confirmCalls = 0;

    const cancelledScenario =
      createToolbarScenario({
        command:
          "clear-formatting",
        confirm: () => {
          confirmCalls++;
          return false;
        },
        value:
          "*Bold*",
        selectionStart:
          0,
        selectionEnd:
          0
      });

    cancelledScenario.buttons[0].click();

    assert.equal(
      confirmCalls,
      1
    );
    assert.equal(
      cancelledScenario.input.value,
      "*Bold*"
    );
    assert.equal(
      cancelledScenario.input.selectionStart,
      0
    );

    const confirmedScenario =
      createToolbarScenario({
        command:
          "clear-formatting",
        confirm: () => true,
        value:
          "*Bold*",
        selectionStart:
          0,
        selectionEnd:
          0
      });

    confirmedScenario.buttons[0].click();

    assert.equal(
      confirmedScenario.input.value,
      "Bold"
    );
    assert.equal(
      confirmedScenario.input.selectionStart,
      0
    );
    assert.equal(
      confirmedScenario.input.selectionEnd,
      4
    );
  }
);

test(
  "editor toolbar supports undo and redo for toolbar edits",
  () => {
    const boldButton =
      createButton({
        editorCommand:
          "bold"
      });

    const undoButton =
      createButton({
        editorCommand:
          "undo"
      });

    const redoButton =
      createButton({
        editorCommand:
          "redo"
      });

    const scenario =
      createToolbarScenario({
        commandButtons: [
          boldButton,
          undoButton,
          redoButton
        ],
        value:
          "hello",
        selectionStart:
          0,
        selectionEnd:
          5
      });

    boldButton.click();
    undoButton.click();

    assert.equal(
      scenario.input.value,
      "hello"
    );
    assert.equal(
      scenario.input.selectionStart,
      0
    );
    assert.equal(
      scenario.input.selectionEnd,
      5
    );

    redoButton.click();

    assert.equal(
      scenario.input.value,
      "*hello*"
    );
    assert.equal(
      scenario.input.selectionStart,
      1
    );
    assert.equal(
      scenario.input.selectionEnd,
      6
    );
  }
);

test(
  "editor toolbar renders Markdown preview without editing the raw text",
  () => {
    const scenario =
      createToolbarScenario({
        command:
          "toggle-preview",
        value:
          "*Bold* _italic_ ~old~\n- item",
        selectionStart:
          0,
        selectionEnd:
          0
      });

    scenario.buttons[0].click();

    assert.equal(
      scenario.input.classList.contains("hidden"),
      true
    );
    assert.equal(
      scenario.templatePreview.classList.contains("hidden"),
      false
    );
    assert.match(
      scenario.templatePreview.innerHTML,
      /<strong>Bold<\/strong>/
    );
    assert.match(
      scenario.templatePreview.innerHTML,
      /<em>italic<\/em>/
    );
    assert.match(
      scenario.templatePreview.innerHTML,
      /<s>old<\/s>/
    );
    assert.match(
      scenario.templatePreview.innerHTML,
      /<ul><li>item<\/li><\/ul>/
    );
    assert.equal(
      scenario.templatePreviewToggle["aria-label"],
      "Hide preview"
    );
    assert.equal(
      scenario.templatePreviewToggle.title,
      "Hide preview"
    );
    assert.equal(
      scenario.input.selectionStart,
      0
    );
  }
);

test(
  "editor toolbar alignment changes editor and preview alignment only",
  () => {
    const alignmentControl =
      createSelect("start");

    const scenario =
      createToolbarScenario({
        commandButtons: [],
        alignmentControls: [
          alignmentControl
        ],
        value:
          "hello",
        selectionStart:
          0,
        selectionEnd:
          0
      });

    alignmentControl.change("center");

    assert.equal(
      scenario.templatesPanel.dataset.editorAlign,
      "center"
    );
    assert.equal(
      scenario.input.style.textAlign,
      "center"
    );
    assert.equal(
      scenario.templatePreview.style.textAlign,
      "center"
    );
    assert.equal(
      scenario.input.selectionStart,
      0
    );
  }
);
