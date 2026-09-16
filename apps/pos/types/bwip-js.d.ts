declare module 'bwip-js' {
  interface ToBufferOptions {
    bcid: string;
    text?: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: string;
    textsize?: number;
    [key: string]: any;
  }

  export function toCanvas(
    canvas: HTMLCanvasElement | string,
    options: ToBufferOptions
  ): HTMLCanvasElement;

  export function toBuffer(
    options: ToBufferOptions,
    callback?: (err: string | Error, png: Buffer) => void
  ): Promise<Buffer>;

  const bwipjs: {
    toCanvas: typeof toCanvas;
    toBuffer: typeof toBuffer;
  };

  export default bwipjs;
}
