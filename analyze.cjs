const fs = require('fs');
const { PNG } = require('pngjs');
const { createWorker } = require('tesseract.js');

async function main() {
  const png = PNG.sync.read(fs.readFileSync('/tmp/ref_image.png'));
  const worker = await createWorker('eng');
  
  const regions = [
    { name: 'header', y0: 0, y1: 65 },
    { name: 'hero_badge_title', y0: 60, y1: 150 },
    { name: 'subtitle_and_banner', y0: 120, y1: 200 },
    { name: 'wallet_card', y0: 190, y1: 280 },
    { name: 'create_payment_title', y0: 270, y1: 330 },
    { name: 'amount_and_chips', y0: 320, y1: 420 },
    { name: 'token_dropdown', y0: 410, y1: 500 },
    { name: 'generate_btn', y0: 490, y1: 575 },
    { name: 'bottom_nav', y0: 570, y1: 640 }
  ];

  for (const reg of regions) {
    const h = reg.y1 - reg.y0;
    const crop = new PNG({ width: png.width * 2, height: h * 2 }); // 2x upscale for sharp OCR
    for (let y = 0; y < h * 2; y++) {
      for (let x = 0; x < png.width * 2; x++) {
        const srcX = Math.floor(x / 2);
        const srcY = Math.floor(y / 2);
        const src = ((reg.y0 + srcY) * png.width + srcX) * 4;
        const dst = (y * png.width * 2 + x) * 4;
        crop.data[dst] = png.data[src];
        crop.data[dst+1] = png.data[src+1];
        crop.data[dst+2] = png.data[src+2];
        crop.data[dst+3] = 255;
      }
    }
    const buf = PNG.sync.write(crop);
    const res = await worker.recognize(buf);
    console.log(`\n=================== [${reg.name.toUpperCase()}] ===================`);
    console.log(res.data.text.trim());
  }

  await worker.terminate();
}

main().catch(console.error);
