async function writeTextToClipboard(text) {
  if (!text) {
    throw new Error("CSV output is empty.");
  }

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch (_error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-1000px";
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (!copied) {
      throw new Error("Clipboard write failed.");
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "COPY_TEXT_TO_CLIPBOARD") {
    return;
  }

  writeTextToClipboard(message.text)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Failed to copy text."
      });
    });

  return true;
});
