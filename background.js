import { rowsToCsv } from "./csv.js";

const MENU_ID = "copy-selected-table-as-csv";
const OFFSCREEN_PATH = "offscreen.html";
let creatingOffscreenDocument = null;

function setBadge(text) {
  chrome.action.setBadgeText({ text }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" }).catch(() => {});
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" }).catch(() => {});
  }, 1500);
}

async function setupContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Copy as CSV",
    contexts: ["selection"]
  });
}

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);

  if (typeof chrome.runtime.getContexts === "function") {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    });
    return contexts.length > 0;
  }

  const allClients = await self.clients.matchAll();
  return allClients.some((client) => client.url === offscreenUrl);
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["CLIPBOARD"],
      justification: "Write CSV text to clipboard from context menu action."
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

function getActiveTab() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0]);
}

async function extractRowsFromPage(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "EXTRACT_SELECTED_TABLE_ROWS"
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || "Failed to read selected table rows.");
  }

  return response.rows;
}

async function copyCsvToClipboard(csvText) {
  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    type: "COPY_TEXT_TO_CLIPBOARD",
    text: csvText
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || "Failed to write CSV to clipboard.");
  }
}

async function handleCopyAsCsv() {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab available.");
  }

  const rows = await extractRowsFromPage(tab.id);
  const csv = rowsToCsv(rows);
  if (!csv) {
    throw new Error("Selection did not produce CSV output.");
  }

  await copyCsvToClipboard(csv);
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenu().catch(() => {});
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  handleCopyAsCsv()
    .then(() => setBadge("CSV"))
    .catch(() => setBadge("ERR"));
});
