const fs = require('fs');
const { PNG } = require('pngjs');
const { createWorker } = require('tesseract.js');

async function main() {
  const png = PNG.sync.read(fs.readFileSync('/tmp/ref_image.png'));
  console.log('Size:', png.width, 'x', png.height);

  // Let's do high-quality sub-image OCR
  const worker = await createWorker('eng');
  
  // Crop into 8 slices
  const numSlices = 8;
  const sliceH = Math.floor(png.height / numSlices);
  for (let i = 0; i < numSlices; i++) {
    const y0 = i * sliceH;
    const y1 = (i === numSlices - 1) ? png.height : (i + 1) * sliceH;
    const crop = new PNG({ width: png.width, height: y1 - y0 });
    for (let y = 0; y < y1 - y0; y++) {
      for (let x = 0; x < png.width; x++) {
        const src = ((y0 + y) * png.width + x) * 4;
        const dst = (y * png.width + x) * 4;
        // make text sharper if contrast is low
        crop.data[dst] = png.data[src];
        crop.data[dst+1] = png.data[src+1];
        crop.data[dst+2] = png.data[src+2];
        crop.data[dst+3] = 255;
      }
    }
    const buf = PNG.sync.write(crop);
    fs.writeFileSync(`/tmp/slice_${i}.png`, buf);
    const res = await worker.recognize(buf);
    console.log(`\n=== SLICE ${i} (Y: ${y0} - ${y1}) ===`);
    console.log(res.data.text.trim());
  }

  await worker.terminate();
}

main().catch(console.error);
