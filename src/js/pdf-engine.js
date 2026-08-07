import { jsPDF } from 'jspdf';
import { PhotoEditor } from './editor.js';

export class PDFEngine {
  static async generatePDF(photos, settings, onProgress) {
    if (!photos || photos.length === 0) {
      throw new Error('No photos provided to generate PDF.');
    }

    const {
      pageSize = 'a4', // a4, letter, legal, fit
      orientation = 'auto', // auto, p (portrait), l (landscape)
      margin = 10, // mm margin
      fitMode = 'fit', // fit, fill, stretch
      quality = 0.9, // 0.5 to 1.0 compression
      showPageNumbers = true,
      pageNumPosition = 'bottom-center', // bottom-center, bottom-right, top-right
      headerText = '',
      footerText = '',
      watermarkText = '',
      fileName = 'converted_photos.pdf'
    } = settings;

    // Standard dimensions in mm
    const STANDARD_SIZES = {
      a4: [210, 297],
      letter: [215.9, 279.4],
      legal: [215.9, 355.6],
      executive: [184.1, 266.7]
    };

    let doc = null;

    for (let i = 0; i < photos.length; i++) {
      if (onProgress) {
        onProgress(i + 1, photos.length);
      }

      const item = photos[i];

      // Process image through editor engine (apply page rotation, filters, brightness)
      const processedImageDataUrl = await PhotoEditor.applyFiltersAndTransform(
        item.originalSrc,
        {
          rotation: item.rotation || 0,
          filter: item.filter || 'none',
          brightness: item.brightness || 0,
          contrast: item.contrast || 0,
          crop: item.crop || null
        }
      );

      // Get natural dimensions of processed image
      const imgDimensions = await PDFEngine.getImageDimensions(processedImageDataUrl);

      let pWidth, pHeight, pOrientation;

      if (pageSize === 'fit') {
        // Fit page dimensions exactly to original image size (converted to mm)
        const pxToMm = 0.264583;
        pWidth = imgDimensions.width * pxToMm;
        pHeight = imgDimensions.height * pxToMm;
        pOrientation = pWidth > pHeight ? 'l' : 'p';
      } else {
        const baseDimensions = STANDARD_SIZES[pageSize] || STANDARD_SIZES.a4;
        let [w, h] = baseDimensions;

        if (orientation === 'auto') {
          pOrientation = imgDimensions.width > imgDimensions.height ? 'l' : 'p';
        } else {
          pOrientation = orientation;
        }

        if (pOrientation === 'l') {
          pWidth = Math.max(w, h);
          pHeight = Math.min(w, h);
        } else {
          pWidth = Math.min(w, h);
          pHeight = Math.max(w, h);
        }
      }

      // Initialize doc on first page, or add new page
      if (i === 0) {
        doc = new jsPDF({
          orientation: pOrientation,
          unit: 'mm',
          format: pageSize === 'fit' ? [pWidth, pHeight] : pageSize
        });
      } else {
        doc.addPage(
          pageSize === 'fit' ? [pWidth, pHeight] : pageSize,
          pOrientation
        );
      }

      // Calculate Printable Area with Margins
      const marginMm = Number(margin);
      const printableX = marginMm;
      const printableY = marginMm + (headerText ? 8 : 0);
      const printableW = pWidth - marginMm * 2;
      const printableH = pHeight - marginMm * 2 - (headerText ? 8 : 0) - (footerText || showPageNumbers ? 8 : 0);

      // Compute Image placement (Fit, Fill, Stretch)
      let drawX = printableX;
      let drawY = printableY;
      let drawW = printableW;
      let drawH = printableH;

      const imgAspect = imgDimensions.width / imgDimensions.height;
      const boxAspect = printableW / printableH;

      if (fitMode === 'fit') {
        if (imgAspect > boxAspect) {
          drawW = printableW;
          drawH = printableW / imgAspect;
          drawY = printableY + (printableH - drawH) / 2;
        } else {
          drawH = printableH;
          drawW = printableH * imgAspect;
          drawX = printableX + (printableW - drawW) / 2;
        }
      } else if (fitMode === 'fill') {
        // Center fill inside printable area
        drawW = printableW;
        drawH = printableH;
      }

      // Draw Image onto PDF page
      doc.addImage(
        processedImageDataUrl,
        'JPEG',
        drawX,
        drawY,
        drawW,
        drawH,
        `img_${i}`,
        quality < 1 ? 'FAST' : 'NONE',
        0
      );

      // Add Header Text
      if (headerText) {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(headerText, pWidth / 2, marginMm + 4, { align: 'center' });
      }

      // Add Footer Text
      if (footerText) {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(footerText, marginMm, pHeight - marginMm - 2);
      }

      // Add Page Numbers
      if (showPageNumbers) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const pageStr = `Page ${i + 1} of ${photos.length}`;

        if (pageNumPosition === 'bottom-center') {
          doc.text(pageStr, pWidth / 2, pHeight - marginMm - 2, { align: 'center' });
        } else if (pageNumPosition === 'bottom-right') {
          doc.text(pageStr, pWidth - marginMm, pHeight - marginMm - 2, { align: 'right' });
        } else if (pageNumPosition === 'top-right') {
          doc.text(pageStr, pWidth - marginMm, marginMm + 4, { align: 'right' });
        }
      }

      // Add Watermark Text
      if (watermarkText) {
        doc.setFontSize(36);
        doc.setTextColor(200, 200, 200);
        // Translucent watermark centered diagonally
        doc.text(watermarkText, pWidth / 2, pHeight / 2, {
          align: 'center',
          angle: 45
        });
      }
    }

    return doc;
  }

  static getImageDimensions(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = dataUrl;
    });
  }

  static downloadPDF(doc, filename = 'PHOTO_TO_PDF.pdf') {
    doc.save(filename);
  }

  static getPDFBlob(doc) {
    return doc.output('blob');
  }

  static getPDFUrl(doc) {
    return doc.output('bloburl');
  }
}
