import { providers } from "../src/providers/index.js";
import { loadSettings, saveSettings } from "../src/settings.js";

const form = document.getElementById("settings-form");
const providerSelect = document.getElementById("defaultProviderId");
const openInNewTab = document.getElementById("openInNewTab");
const contextMenuEnabled = document.getElementById("contextMenuEnabled");
const providerNotes = document.getElementById("provider-notes");
const status = document.getElementById("status");

function populateProviders(selectedId) {
  providerSelect.replaceChildren();
  for (const provider of providers) {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = provider.name;
    if (provider.id === selectedId) {
      option.selected = true;
    }
    providerSelect.appendChild(option);
  }
  updateNotes();
}

function updateNotes() {
  const provider = providers.find((p) => p.id === providerSelect.value);
  providerNotes.textContent = provider?.config.notes ?? "";
}

providerSelect.addEventListener("change", updateNotes);

async function hydrate() {
  const settings = await loadSettings();
  populateProviders(settings.defaultProviderId);
  openInNewTab.checked = settings.openInNewTab;
  contextMenuEnabled.checked = settings.contextMenuEnabled;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveSettings({
    defaultProviderId: providerSelect.value,
    openInNewTab: openInNewTab.checked,
    contextMenuEnabled: contextMenuEnabled.checked,
  });
  status.textContent = "Saved.";
  setTimeout(() => {
    status.textContent = "";
  }, 1800);
});

hydrate();
