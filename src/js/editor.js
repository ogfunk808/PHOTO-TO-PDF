export class PhotoEditor {
  static applyFiltersAndTransform(imageSrc, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const {
          rotation = 0, // 0, 90, 180, 270
          filter = 'none', // none, scanner, grayscale, vintage, warm, cool
          brightness = 0, // -100 to 100
          contrast = 0, // -100 to 100
          crop = null // {x, y, width, height} in ratios (0-1)
        } = options;

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        // Calculate source dimensions after crop
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (crop && crop.width > 0 && crop.height > 0) {
          sx = crop.x * img.naturalWidth;
          sy = crop.y * img.naturalHeight;
          sw = crop.width * img.naturalWidth;
          sh = crop.height * img.naturalHeight;
        }

        // Determine canvas dimensions based on rotation
        const isRotated = rotation % 180 !== 0;
        canvas.width = isRotated ? sh : sw;
        canvas.height = isRotated ? sw : sh;

        // Apply Transformation
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.drawImage(
          img,
          sx, sy, sw, sh,
          -sw / 2, -sh / 2, sw, sh
        );
        ctx.restore();

        // Apply Pixel Filters
        if (filter !== 'none' || brightness !== 0 || contrast !== 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Contrast multiplier
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Brightness
            r += brightness * 2.55;
            g += brightness * 2.55;
            b += brightness * 2.55;

            // Contrast
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;

            // Filters
            if (filter === 'grayscale') {
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              r = g = b = gray;
            } else if (filter === 'scanner') {
              // High-Contrast Document Scanner Filter
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              // Adaptive-like binarization threshold
              const thresh = 140;
              const val = gray > thresh ? 255 : (gray < 80 ? 0 : (gray - 80) * (255 / 60));
              r = g = b = Math.min(255, Math.max(0, val));
            } else if (filter === 'vintage') {
              const r1 = r * 0.393 + g * 0.769 + b * 0.189;
              const g1 = r * 0.349 + g * 0.686 + b * 0.168;
              const b1 = r * 0.272 + g * 0.534 + b * 0.131;
              r = r1; g = g1; b = b1;
            } else if (filter === 'warm') {
              r += 20;
              b -= 15;
            } else if (filter === 'cool') {
              r -= 15;
              b += 20;
            }

            data[i] = Math.min(255, Math.max(0, r));
            data[i + 1] = Math.min(255, Math.max(0, g));
            data[i + 2] = Math.min(255, Math.max(0, b));
          }

          ctx.putImageData(imageData, 0, 0);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };

      img.onerror = (err) => reject(err);
      img.src = imageSrc;
    });
  }

  // Create thumbnail with high speed
  static createThumbnail(imageSrc, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }
}
