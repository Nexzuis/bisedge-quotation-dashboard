import QRCode from 'qrcode';

/**
 * Generate a PNG placeholder when QR code generation fails
 */
function qrFallbackPng(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#CCCCCC';
  ctx.fillRect(0, 0, 200, 200);

  ctx.fillStyle = '#666666';
  ctx.font = '14px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('QR Code', 100, 100);

  return canvas.toDataURL('image/png');
}

/**
 * Generate QR Code as Data URI (PNG)
 */
export async function generateQRCode(url: string): Promise<string> {
  try {
    const qrCodeDataUri = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    return qrCodeDataUri;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return qrFallbackPng();
  }
}

/**
 * Get Linde product URL for model code
 */
export function getLindeProductUrl(modelCode: string): string {
  const cleanCode = modelCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://www.linde-mh.com/en/products/electric-forklift-trucks/${cleanCode}`;
}
