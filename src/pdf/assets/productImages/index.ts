/**
 * Product Image Placeholders
 * Renders PNG placeholders via Canvas API for @react-pdf/renderer compatibility
 */

export function getProductImage(modelCode: string, modelName: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(0, 0, 400, 300);

  // Inner box
  ctx.fillStyle = '#CCCCCC';
  ctx.beginPath();
  ctx.roundRect(50, 80, 300, 140, 8);
  ctx.fill();

  // Model code
  ctx.fillStyle = '#666666';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(modelCode, 200, 140);

  // Model name
  ctx.fillStyle = '#999999';
  ctx.font = '12px Helvetica, Arial, sans-serif';
  ctx.fillText(modelName, 200, 170);

  return canvas.toDataURL('image/png');
}

/**
 * Get forklift icon for category (PNG via Canvas)
 */
export function getForkliftIcon(_category: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  // Body
  ctx.fillStyle = '#003B5C';
  ctx.beginPath();
  ctx.roundRect(20, 30, 40, 35, 2);
  ctx.fill();

  // Mast left
  ctx.fillRect(15, 55, 10, 20);
  // Mast right
  ctx.fillRect(55, 55, 10, 20);

  // Wheels
  ctx.fillStyle = '#666666';
  ctx.beginPath();
  ctx.arc(20, 72, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, 72, 5, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
