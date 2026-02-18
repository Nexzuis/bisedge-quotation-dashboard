import QRCode from 'qrcode';

/**
 * Generate QR Code as Data URI
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
    // Return a placeholder SVG if QR code generation fails
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0NDQ0NDQyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2Ij5RUiBDb2RlPC90ZXh0Pjwvc3ZnPg==';
  }
}

/**
 * Get Linde product URL for model code
 */
export function getLindeProductUrl(modelCode: string): string {
  // Construct Linde website URL for product
  const cleanCode = modelCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://www.linde-mh.com/en/products/electric-forklift-trucks/${cleanCode}`;
}
