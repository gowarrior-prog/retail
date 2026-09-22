export function generateStickerPrintHtml(params: {
  labelWidthMm: number;
  labelHeightMm: number;
  barcodeWidthMm: number;
  barcodeHeightMm: number;
  shopName: string;
  showShopName: boolean;
  productName: string;
  barcodeValue: string;
  showPrice: boolean;
  priceFormatted: string;
  shopFontSizePt: number;
  titleFontSizePt: number;
  barcodeTextFontSizePt: number;
  priceFontSizePt: number;
  canvasDataUrl: string;
  copiesCount: number;
}): string {
  const {
    labelWidthMm, labelHeightMm, barcodeWidthMm, barcodeHeightMm,
    shopName, showShopName, productName, barcodeValue, showPrice, priceFormatted,
    shopFontSizePt, titleFontSizePt, barcodeTextFontSizePt, priceFontSizePt,
    canvasDataUrl, copiesCount
  } = params;

  let stickersHtml = '';
  for (let i = 0; i < copiesCount; i++) {
    stickersHtml += `
      <div class="sticker-card">
        ${showShopName ? `<div class="shop-name">${shopName}</div>` : ''}
        <div class="product-title">${productName}</div>
        <img class="barcode-img" src="${canvasDataUrl}" alt="Barcode" />
        <div class="barcode-text">${barcodeValue}</div>
        ${showPrice ? `<div class="price">${priceFormatted}</div>` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Print Barcode Stickers</title>
        <style>
          @page { size: ${labelWidthMm}mm ${labelHeightMm}mm; margin: 0 !important; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
          body { width: ${labelWidthMm}mm; background: #fff; text-align: center; }
          .sticker-card {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            page-break-after: always;
            overflow: hidden;
          }
          .shop-name { font-size: ${shopFontSizePt}pt; font-weight: bold; color: #111; line-height: 1.1; }
          .product-title { font-size: ${titleFontSizePt}pt; font-weight: 800; color: #000; line-height: 1.1; margin-top: 1px; }
          .barcode-img {
            width: ${barcodeWidthMm}mm;
            height: ${barcodeHeightMm}mm;
            max-height: ${barcodeHeightMm}mm;
            object-fit: contain;
            display: block;
            margin: 0 auto;
          }
          .barcode-text { font-size: ${barcodeTextFontSizePt}pt; font-family: monospace; font-weight: bold; letter-spacing: 0.5px; }
          .price { font-size: ${priceFontSizePt}pt; font-weight: bold; align-self: flex-end; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        ${stickersHtml}
      </body>
    </html>
  `;
}
