const express = require("express");
const bwipjs = require("bwip-js");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/barcode", async (req, res) => {
  defaults = {
    pageHeight: 839, // 72 / 25.4 * 296
    pageWidth: 600.9, // 72 / 25.4 * 212
    topMargin: 24, // 72 / 25.4 * 8.5
    leftMargin: 46.8, // 72 / 25.4 * 16.5
    bottomMargin: 24, // 72 / 25.4 * 8.5
    rightMargin: 46.8, // 72 / 25.4 * 16.5
    hSpacing: 14.2, // 72 / 25.4 * 5,
    vSpacing: 0,
    labelsAcross: 6,
    labelsDown: 11,
    startFrom: 1,
  };

  const { ids, options = {} } = req.body;

  const mergedOptions = { ...defaults, ...options };
  const {
    pageHeight,
    pageWidth,
    topMargin,
    bottomMargin,
    rightMargin,
    leftMargin,
    hSpacing,
    vSpacing,
    labelsAcross,
    labelsDown,
    startFrom,
  } = mergedOptions;

  console.log(mergedOptions);

  // Prepend startFrom null elements to the existing array
  for (let i = 0; i < startFrom - 1; i++) {
    ids.unshift(null);
  }

  labelWidth =
    (pageWidth - leftMargin - rightMargin - (labelsAcross - 1) * hSpacing) /
    labelsAcross;
  labelHeight =
    (pageHeight - topMargin - bottomMargin - (labelsDown - 1) * vSpacing) /
    labelsDown;
  mergedOptions.labelWidth = labelWidth;
  mergedOptions.labelHeight = labelHeight;
  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margin: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  });

  // Set the response headers for PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="barcodes.pdf"');

  // Pipe the PDF document to the response
  doc.pipe(res);

  doc.font("Helvetica-Oblique").fontSize(5);

  // Calculate the number of pages needed based on the number of barcodes
  const totalPages = Math.ceil(ids.length / (labelsAcross * labelsDown));

  // Generate the barcodes and draw the grid on each page
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Draw the grid lines
    //drawGrid(doc, mergedOptions);

    const startIndex = page * (labelsAcross * labelsDown);
    const endIndex = Math.min(
      startIndex + labelsAcross * labelsDown,
      ids.length
    );

    // Generate and place the barcodes in the grid
    for (let i = startIndex; i < endIndex; i++) {
      const id = ids[i];
      if (id !== null) {
        const row = Math.floor((i - startIndex) / labelsAcross);
        const col = (i - startIndex) % labelsAcross;

        const x = leftMargin + col * (labelWidth + hSpacing);
        const y = topMargin + row * labelHeight;

        // Place the barcode at the grid position
        await placeBarcode(doc, x + 5, y + 8, id);
        doc.save();
        doc.lineWidth(0.25);
        doc.strokeColor("red");
        doc.dash(1, { space: 1 });
        doc.rect(x, y, labelWidth, labelHeight).stroke();
        const items = [
          "Label",
          "item 2",
          "oooooooooooo",
          "iiiiiiiiiiii",
          "0123456789WW",
          "WWWWWWWW",
          "ABCDEFGHIJKL",
        ];
        const lineHeight = 8;
        for (let i = 0; i < items.length; i++) {
          doc.text(items[i], x + labelWidth / 2 - 5, y + lineHeight * (i + 1), {
            lineBreak: false,
          });
          doc.moveDown();
        }
        doc.restore();
      }
    }
  }

  // Finalize the PDF document and end the response
  doc.end();
  console.log(`Doc Complete`);
});

// Function to place a barcode at the specified position
async function placeBarcode(doc, x, y, id, options) {
  return new Promise((resolve, reject) => {
    // Generate the barcode using bwip-js
    bwipjs.toBuffer(
      {
        bcid: "code128", // Barcode type
        text: id, // ID to be encoded
        scale: 2, // Size of the barcode
        height: 10, // Height of the barcode
        includetext: true, // Include the ID as text below the barcode
        textxalign: "center", // Center-align the text
        rotate: "L", // Rotate 90 degrees clockwise (use 'L' for counterclockwise)
      },
      (err, png) => {
        if (err) {
          reject(err);
        } else {
          // Embed the barcode PNG image in the PDF document
          doc.image(png, x, y, { scale: 0.3 });
          resolve();
        }
      }
    );
  });
}

// Function to draw grid lines on the document
function drawGrid(doc, options) {
  const {
    topMargin,
    leftMargin,
    hSpacing,
    vSpacing,
    labelsAcross,
    labelsDown,
    startFrom,
  } = options;
  doc.save();
  doc.lineWidth(0.25);
  doc.strokeColor("red");
  doc.dash(1, { space: 1 });

  for (let row = 0; row <= labelsDown; row++) {
    const y_coord = topMargin + row * labelHeight;
    for (let col = 0; col <= 5; col++) {
      const x_coord = leftMargin + col * (labelWidth + hSpacing);
      doc.rect(x_coord, y_coord, labelWidth, labelHeight).stroke();
      doc.text("X", x_coord + labelWidth - 10, y_coord + labelHeight - 10);
    }
  }

  doc.restore();
}

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
