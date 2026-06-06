import type { AssetType } from "@shared/types";

export interface ClipboardResult {
  success: boolean;
  payload: string;
  label: string;
}

/**
 * Type-aware clipboard copy routing:
 * - color      → HEX value
 * - font       → base64 @font-face CSS block
 * - code/html  → raw source string
 * - link       → raw URL string
 * - media      → storage URL or data-URI
 * - binary     → raw binary payload
 */
export async function smartCopy(
  type: AssetType,
  primaryPayload: string | null | undefined,
  fallbackPayload?: string | null,
  meta?: Record<string, any>
): Promise<ClipboardResult> {
  let payload = "";
  let label = "Copied";

  switch (type) {
    case "color": {
      // Copy HEX — the most universally useful color format
      payload = meta?.colorHex ?? primaryPayload ?? "";
      label = `HEX ${payload}`;
      break;
    }

    case "font_package": {
      // Copy as a ready-to-use @font-face CSS block
      const fontFamily = meta?.fontFamily ?? "CustomFont";
      const dataUri = primaryPayload ?? fallbackPayload ?? "";
      if (dataUri.startsWith("data:")) {
        payload = `@font-face {\n  font-family: "${fontFamily}";\n  src: url("${dataUri}");\n  font-display: swap;\n}`;
        label = `@font-face for ${fontFamily}`;
      } else {
        payload = primaryPayload ?? "";
        label = `Font: ${fontFamily}`;
      }
      break;
    }

    case "shadow_dom":
    case "plain_text": {
      // Copy raw source code
      payload = primaryPayload ?? "";
      label = "Source code copied";
      break;
    }

    case "link_preview": {
      // Copy raw URL
      payload = primaryPayload ?? meta?.sourceUrl ?? "";
      label = "URL copied";
      break;
    }

    case "media_element": {
      // Copy storage URL or data-URI
      payload = primaryPayload ?? "";
      label = "Media URL copied";
      break;
    }

    case "raw_binary": {
      payload = primaryPayload ?? fallbackPayload ?? "";
      label = "Binary payload copied";
      break;
    }

    default: {
      payload = primaryPayload ?? "";
      label = "Copied";
    }
  }

  if (!payload) {
    return { success: false, payload: "", label: "Nothing to copy" };
  }

  try {
    await navigator.clipboard.writeText(payload);
    return { success: true, payload, label };
  } catch {
    // Fallback for non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = payload;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return { success: ok, payload, label };
  }
}

/**
 * Returns a human-readable description of what will be copied for a given asset type
 */
export function getCopyLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    color: "Copy HEX",
    font_package: "Copy @font-face",
    shadow_dom: "Copy Source",
    plain_text: "Copy Text",
    link_preview: "Copy URL",
    media_element: "Copy URL",
    raw_binary: "Copy Payload",
  };
  return labels[type] ?? "Copy";
}
