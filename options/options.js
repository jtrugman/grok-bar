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
    const experimental =
      provider.id === "gemini" ? " (experimental)" : "";
    option.textContent = `${provider.name}${experimental}`;
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
  try {
    const settings = await loadSettings();
    populateProviders(settings.defaultProviderId);
    openInNewTab.checked = settings.openInNewTab;
    contextMenuEnabled.checked = settings.contextMenuEnabled;
  } catch (err) {
    status.textContent = "Could not load settings.";
    console.error("AI Omnibox options: load failed", String(err));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Saving…";
  try {
    await saveSettings({
      defaultProviderId: providerSelect.value,
      openInNewTab: openInNewTab.checked,
      contextMenuEnabled: contextMenuEnabled.checked,
    });
    status.textContent = "Saved.";
    setTimeout(() => {
      if (status.textContent === "Saved.") {
        status.textContent = "";
      }
    }, 1800);
  } catch (err) {
    status.textContent = "Save failed.";
    console.error("AI Omnibox options: save failed", String(err));
  }
});

hydrate();
