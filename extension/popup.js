const apiUrlInput = document.getElementById("apiUrl");
const authTokenInput = document.getElementById("authToken");
const extractBtn = document.getElementById("extractBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

// Restore saved settings
chrome.storage.local.get(["moovasApiUrl", "moovasAuthToken"], (data) => {
  if (data.moovasApiUrl) apiUrlInput.value = data.moovasApiUrl;
  if (data.moovasAuthToken) authTokenInput.value = data.moovasAuthToken;
});

// Save settings on change
apiUrlInput.addEventListener("change", () => {
  chrome.storage.local.set({ moovasApiUrl: apiUrlInput.value });
});
authTokenInput.addEventListener("change", () => {
  chrome.storage.local.set({ moovasAuthToken: authTokenInput.value });
});

extractBtn.addEventListener("click", async () => {
  const apiUrl = apiUrlInput.value.trim();
  const authToken = authTokenInput.value.trim();

  if (!apiUrl) {
    setStatus("Please enter your Moovas instance URL.", "err");
    return;
  }

  extractBtn.disabled = true;
  setStatus("Extracting assets from page…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script if not already present
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Request extraction
    const extracted = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_ASSETS" });

    const total = (extracted.fonts?.length ?? 0) +
      (extracted.colors?.length ?? 0) +
      (extracted.images?.length ?? 0) +
      (extracted.codeBlocks?.length ?? 0);

    setStatus(`Found ${total} assets. Sending to Moovas…`);
    showResults(extracted);

    if (authToken) {
      const assets = buildAssetPayloads(extracted);
      const result = await chrome.runtime.sendMessage({
        type: "SEND_TO_MOOVAS",
        assets,
        authToken,
      });
      if (result.success) {
        setStatus(`✓ ${assets.length} assets imported to Moovas.`, "ok");
      } else {
        setStatus(`Import failed: ${result.error}`, "err");
      }
    } else {
      setStatus(`${total} assets found. Add auth token to import.`);
    }
  } catch (err) {
    setStatus(`Error: ${err.message}`, "err");
  } finally {
    extractBtn.disabled = false;
  }
});

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = `status ${cls}`;
}

function showResults(extracted) {
  resultsEl.style.display = "block";
  resultsEl.innerHTML = `
    <div class="row"><span>Fonts</span><strong>${extracted.fonts?.length ?? 0}</strong></div>
    <div class="row"><span>Colors</span><strong>${extracted.colors?.length ?? 0}</strong></div>
    <div class="row"><span>Images</span><strong>${extracted.images?.length ?? 0}</strong></div>
    <div class="row"><span>Code blocks</span><strong>${extracted.codeBlocks?.length ?? 0}</strong></div>
  `;
}

function buildAssetPayloads(extracted) {
  const assets = [];

  (extracted.fonts ?? []).forEach((f) => {
    assets.push({
      type: "font_package",
      tab: "fonts",
      title: f.name,
      primaryPayload: f.cssBlock ?? f.name,
      meta: { fontFamily: f.name, sourceUrl: extracted.url },
    });
  });

  (extracted.colors ?? []).forEach((c) => {
    assets.push({
      type: "color",
      tab: "colors",
      title: c.hex,
      primaryPayload: c.hex,
      meta: { colorHex: c.hex, colorRgba: c.rgba, sourceUrl: extracted.url },
    });
  });

  (extracted.images ?? []).slice(0, 10).forEach((img) => {
    assets.push({
      type: "media_element",
      tab: "media",
      title: img.alt || img.src.split("/").pop() || "Image",
      primaryPayload: img.src,
      meta: { mimeType: "image/*", width: img.width, height: img.height, sourceUrl: extracted.url },
    });
  });

  (extracted.codeBlocks ?? []).forEach((block, i) => {
    assets.push({
      type: "shadow_dom",
      tab: "code",
      title: `Code block ${i + 1} from ${extracted.title}`,
      primaryPayload: block.content,
      meta: { sourceUrl: extracted.url },
    });
  });

  return assets;
}
