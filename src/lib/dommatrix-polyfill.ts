// pdf-parse (cez pdfjs-dist) pri načítaní očakáva globálny DOMMatrix z prehliadača,
// ktorý v serverless Node prostredí (Vercel) neexistuje — bez polyfillu padá s
// "ReferenceError: DOMMatrix is not defined". Reálne vykresľovanie nepoužívame
// (len getText()), takže stačí minimálna atrapa, nie presná matematika.
if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    constructor(init?: number[]) {
      if (init && init.length === 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }
  // @ts-expect-error minimálna atrapa, nie plná DOM implementácia
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

export {};
