'use client';

import React, { useEffect, useRef } from 'react';
import bwipjs from 'bwip-js';

interface BarcodeCanvasProps {
  barcodeValue: string;
}

export default function BarcodeCanvas({ barcodeValue }: BarcodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && barcodeValue) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128',
          text: barcodeValue,
          scale: 12,
          height: 25,
          includetext: false,
          paddingwidth: 8,
          paddingheight: 2,
          backgroundcolor: 'FFFFFF',
          barcolor: '000000',
        });
      } catch (err) {
        console.error('bwip-js barcode canvas render error:', err);
      }
    }
  }, [barcodeValue]);

  return <canvas ref={canvasRef} className="hidden" />;
}
