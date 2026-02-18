/**
 * Bisedge Logo (Static SVG-based placeholders as data URIs)
 * No Canvas dependency — works reliably within @react-pdf/renderer
 */

function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

const bisedgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60">
  <rect width="200" height="60" fill="#003B5C"/>
  <text x="100" y="34" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">BISEDGE</text>
</svg>`;

const lindeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">
  <rect width="120" height="40" fill="#E4002B"/>
  <text x="60" y="26" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LINDE</text>
</svg>`;

export const bisedgeLogo = {
  text: 'BISEDGE',
  subtitle: 'Linde Material Handling | Official Dealer',
  base64: svgToDataUri(bisedgeSvg),
};

export const lindeLogo = {
  text: 'LINDE',
  base64: svgToDataUri(lindeSvg),
};
