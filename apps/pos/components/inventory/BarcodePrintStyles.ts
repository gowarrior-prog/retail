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
        <div class="footer-row">
          <span class="barcode-text">${barcodeValue}</span>
          ${showPrice ? `<span class="price">${priceFormatted}</span>` : ''}
        </div>
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
          @page {
            size: ${labelWidthMm}mm ${labelHeightMm}mm;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
          }
          html, body {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          .sticker-card {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            padding: 1.2mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            overflow: hidden;
            background: #ffffff;
            box-sizing: border-box;
          }
          .sticker-card:not(:last-child) {
            page-break-after: always;
            break-after: page;
          }
          .shop-name {
            font-size: ${shopFontSizePt}pt;
            font-weight: bold;
            color: #000;
            line-height: 1.1;
            text-align: center;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .product-title {
            font-size: ${titleFontSizePt}pt;
            font-weight: 800;
            color: #000;
            line-height: 1.1;
            text-align: center;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 0.5px;
          }
          .barcode-img {
            width: ${barcodeWidthMm}mm;
            height: ${barcodeHeightMm}mm;
            max-height: ${barcodeHeightMm}mm;
            object-fit: fill;
            display: block;
            margin: 1px auto;
          }
          .footer-row {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 0.5px;
            padding: 0 1mm;
          }
          .barcode-text {
            font-size: ${barcodeTextFontSizePt}pt;
            font-family: 'Courier New', Courier, monospace;
            font-weight: 900;
            color: #000;
            letter-spacing: 0.5px;
          }
          .price {
            font-size: ${priceFontSizePt}pt;
            font-weight: 900;
            color: #000;
          }
        </style>
      </head>
      <body onload="setTimeout(function(){ window.print(); window.close(); }, 150);">
        ${stickersHtml}
      </body>
    </html>
  `;
}
