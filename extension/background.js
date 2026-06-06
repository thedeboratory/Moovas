/**
 * Moovas Asset Harvester — Background Service Worker
 *
 * Handles communication between the popup and content scripts,
 * and manages the connection to the Moovas API.
 *
 * SETUP: Set MOOVAS_API_URL to your deployed Moovas instance.
 */

const MOOVAS_API_URL = "https://your-moovas-instance.manus.space";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SEND_TO_MOOVAS") {
    sendAssetsToMoovas(message.assets, message.authToken)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }
});

async function sendAssetsToMoovas(assets, authToken) {
  const results = [];
  for (const asset of assets) {
    const res = await fetch(`${MOOVAS_API_URL}/api/trpc/assets.create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ json: asset }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    results.push(await res.json());
  }
  return results;
}
