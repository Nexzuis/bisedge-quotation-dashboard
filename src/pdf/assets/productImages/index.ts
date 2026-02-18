/**
 * Product Image Placeholders
 * Static SVG data URIs — no Canvas dependency, works in @react-pdf/renderer
 */

function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

export function getProductImage(modelCode: string, modelName: string): string {
  const escapedCode = modelCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedName = modelName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <rect width="400" height="300" fill="#F5F5F5"/>
  <rect x="50" y="80" width="300" height="140" rx="8" fill="#CCCCCC"/>
  <text x="200" y="148" font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="bold" fill="#666666" text-anchor="middle">${escapedCode}</text>
  <text x="200" y="175" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#999999" text-anchor="middle">${escapedName}</text>
</svg>`;

  return svgToDataUri(svg);
}

/**
 * Get forklift icon for category (SVG data URI)
 */
export function getForkliftIcon(_category: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect x="20" y="30" width="40" height="35" rx="2" fill="#003B5C"/>
  <rect x="15" y="55" width="10" height="20" fill="#003B5C"/>
  <rect x="55" y="55" width="10" height="20" fill="#003B5C"/>
  <circle cx="20" cy="72" r="5" fill="#666666"/>
  <circle cx="60" cy="72" r="5" fill="#666666"/>
</svg>`;

  return svgToDataUri(svg);
}
