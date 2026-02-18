/**
 * Bisedge Logo (Text-based placeholder rendered as PNG)
 * Uses Canvas API to produce raster images compatible with @react-pdf/renderer
 */

let bisedgePng: string | null = null;
let lindePng: string | null = null;

function renderLogoPng(
  width: number,
  height: number,
  bgColor: string,
  text: string,
  fontSize: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toDataURL('image/png');
}

export const bisedgeLogo = {
  text: 'BISEDGE',
  subtitle: 'Linde Material Handling | Official Dealer',

  get base64(): string {
    if (!bisedgePng) {
      bisedgePng = renderLogoPng(200, 60, '#003B5C', 'BISEDGE', 24);
    }
    return bisedgePng;
  },
};

export const lindeLogo = {
  text: 'LINDE',

  get base64(): string {
    if (!lindePng) {
      lindePng = renderLogoPng(120, 40, '#E4002B', 'LINDE', 18);
    }
    return lindePng;
  },
};
