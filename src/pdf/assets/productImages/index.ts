/**
 * Product Image Placeholders
 * Generate SVG placeholders for product images
 */

export function getProductImage(modelCode: string, modelName: string): string {
  // Generate a simple SVG placeholder with model code and name
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#F5F5F5"/>
      <rect x="50" y="80" width="300" height="140" fill="#CCCCCC" rx="8"/>
      <text x="200" y="145" font-size="20" font-weight="bold" text-anchor="middle" fill="#666666" font-family="Helvetica">
        ${modelCode}
      </text>
      <text x="200" y="170" font-size="12" text-anchor="middle" fill="#999999" font-family="Helvetica">
        ${modelName}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get forklift icon for category
 */
export function getForkliftIcon(_category: string): string {
  // Simple forklift icon placeholder
  const svg = `
    <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" fill="transparent"/>
      <rect x="20" y="30" width="40" height="35" fill="#003B5C" rx="2"/>
      <rect x="15" y="55" width="10" height="20" fill="#003B5C"/>
      <rect x="55" y="55" width="10" height="20" fill="#003B5C"/>
      <circle cx="20" cy="72" r="5" fill="#666666"/>
      <circle cx="60" cy="72" r="5" fill="#666666"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
