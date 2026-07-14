# Install Search with Grok (first time)

This turns your Chrome address bar into a Grok search box.  
Type a question, press Enter, get Grok. No special keyword.

**Supported for default search:** Chrome on **macOS** and **Windows**.  
(Chrome’s “override default search engine” API is not available the same way on Linux.)

---

## 1. Open the extensions page

1. Open Chrome.
2. In the address bar, type:

   ```text
   chrome://extensions
   ```

3. Press **Enter**.

---

## 2. Turn on Developer mode

1. Look at the **top right** of that page.
2. Turn **Developer mode** **on**.

---

## 3. Load this folder

1. Click **Load unpacked**.
2. Choose this project folder:

   ```text
   grok-bar
   ```

   (The folder that contains `manifest.json`.)

3. Click **Select** / **Open**.

You should see an extension named **Search with Grok**.

---

## 4. Make Grok your default search (important)

The extension adds Grok as a search engine. You still need to make it **default** once.

### Option A: If Chrome asks you

When Chrome asks to change your default search engine, choose **Grok**.

### Option B: If Chrome does not ask (most common)

1. In the address bar, type:

   ```text
   chrome://settings/searchEngines
   ```

2. Press **Enter**.
3. Under **Search engines**, find **Grok**.
4. Click the three dots (**⋮**) next to Grok.
5. Click **Make default**.

You can also get there via:

**Chrome menu → Settings → Search engine → Manage search engines and site search**

---

## 5. Try it

1. Click the address bar (the place you usually type Google searches).
2. Type something simple, for example:

   ```text
   hello grok
   ```

3. Press **Enter**.

You should land on Grok with that question.

---

## Checklist

| Step | Done? |
| --- | --- |
| Opened `chrome://extensions` | |
| Developer mode is on | |
| Loaded the `grok-bar` folder | |
| Grok is **default** under search engines | |
| Typed a question and pressed Enter → Grok opened | |

---

## If it still goes to Google

1. Open `chrome://settings/searchEngines` again.
2. Confirm the **default** search engine says **Grok** (not Google).
3. On `chrome://extensions`, click **Reload** on **Search with Grok**.
4. Try the address bar again.

---

## If the extension is missing after Chrome restarts

Chrome sometimes disables unpacked extensions.

1. Open `chrome://extensions`.
2. Find **Search with Grok**.
3. Turn it back **on**, or click **Load unpacked** again and pick the same folder.

---

## Optional extras (you can ignore these)

- **Right-click text → Ask Grok** works if you leave the context menu on in Options.
- Typing `ai` then Space is only for other AIs. You do **not** need it for normal Grok search.

To open Options: click the extension’s **Details** on `chrome://extensions`, then **Extension options**.

---

## Uninstall

1. Open `chrome://extensions`.
2. Find **Search with Grok**.
3. Click **Remove**.
4. Optionally set Google (or another engine) back as default under `chrome://settings/searchEngines`.
