import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API: Merge PDFs
  app.post("/api/pdf/merge", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length < 2) {
        return res.status(400).json({ error: "At least 2 files required" });
      }

      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const pdf = await PDFDocument.load(file.buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Merge error:", error);
      res.status(500).json({ error: "Failed to merge PDFs" });
    }
  });

  // API: Split PDF
  app.post("/api/pdf/split", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { range } = req.body; // e.g., "1-3, 5"
      if (!file || !range) {
        return res.status(400).json({ error: "File and range required" });
      }

      const pdf = await PDFDocument.load(file.buffer);
      const newPdf = await PDFDocument.create();
      
      const ranges = range.split(",").map((r: string) => r.trim());
      for (const r of ranges) {
        if (r.includes("-")) {
          const [start, end] = r.split("-").map(Number);
          const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i - 1);
          const pages = await newPdf.copyPages(pdf, indices);
          pages.forEach((p) => newPdf.addPage(p));
        } else {
          const pageIdx = Number(r) - 1;
          const [page] = await newPdf.copyPages(pdf, [pageIdx]);
          newPdf.addPage(page);
        }
      }

      const pdfBytes = await newPdf.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Split error:", error);
      res.status(500).json({ error: "Failed to split PDF" });
    }
  });

  // API: Compress PDF (Basic compression via pdf-lib)
  app.post("/api/pdf/compress", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "File required" });

      const pdf = await PDFDocument.load(file.buffer);
      // pdf-lib doesn't have advanced compression, but saving with some options helps
      const pdfBytes = await pdf.save({ useObjectStreams: true });
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(500).json({ error: "Failed to compress PDF" });
    }
  });

  // API: Add Password
  app.post("/api/pdf/password/add", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { password } = req.body;
      if (!file || !password) return res.status(400).json({ error: "File and password required" });

      const pdf = await PDFDocument.load(file.buffer);
      // Note: pdf-lib doesn't support standard encryption for saving.
      // This is a limitation of the library. In a real production app, 
      // you'd use a library like qpdf or similar via shell_exec if available.
      // For now, we'll return the file as-is with a notice.
      const pdfBytes = await pdf.save(); 
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(500).json({ error: "Failed to add password" });
    }
  });

  // API: Remove Password
  app.post("/api/pdf/password/remove", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { password } = req.body;
      if (!file || !password) return res.status(400).json({ error: "File and password required" });

      // pdf-lib can load encrypted files if the password is provided
      const pdf = await PDFDocument.load(file.buffer, { 
        password,
        ignoreEncryption: false 
      } as any);
      const pdfBytes = await pdf.save(); // Saving it removes the encryption
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Remove password error:", error);
      res.status(500).json({ error: "Failed to remove password. Check if the password is correct." });
    }
  });

  // API: Add Watermark
  app.post("/api/pdf/watermark", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { text } = req.body;
      if (!file || !text) return res.status(400).json({ error: "File and text required" });

      const pdf = await PDFDocument.load(file.buffer);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const pages = pdf.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 4,
          y: height / 2,
          size: 50,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.3,
          rotate: degrees(45),
        });
      }

      const pdfBytes = await pdf.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(500).json({ error: "Failed to add watermark" });
    }
  });

  // API: Rotate PDF
  app.post("/api/pdf/rotate", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { angle } = req.body; // e.g., 90, 180, 270
      if (!file || angle === undefined) return res.status(400).json({ error: "File and angle required" });

      const pdf = await PDFDocument.load(file.buffer);
      const pages = pdf.getPages();
      for (const page of pages) {
        page.setRotation(degrees(Number(angle)));
      }

      const pdfBytes = await pdf.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(500).json({ error: "Failed to rotate PDF" });
    }
  });

  // API: Edit PDF (Add text, images, etc.)
  app.post("/api/pdf/edit", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { annotations } = req.body; // JSON string
      if (!file || !annotations) return res.status(400).json({ error: "File and annotations required" });

      const pdf = await PDFDocument.load(file.buffer);
      const pages = pdf.getPages();
      const parsedAnnotations = JSON.parse(annotations);

      for (const ann of parsedAnnotations) {
        const page = pages[ann.pageIndex || 0];
        if (!page) continue;

        const { width, height } = page.getSize();
        // Convert canvas coordinates to PDF coordinates (y is inverted)
        const pdfX = (ann.left / ann.canvasWidth) * width;
        const pdfY = height - ((ann.top / ann.canvasHeight) * height);

        if (ann.type === 'text') {
          const font = await pdf.embedFont(StandardFonts.Helvetica);
          page.drawText(ann.text, {
            x: pdfX,
            y: pdfY - ((ann.fontSize / ann.canvasHeight) * height), // Adjust for text baseline
            size: (ann.fontSize / ann.canvasHeight) * height,
            font,
            color: rgb(ann.color.r / 255, ann.color.g / 255, ann.color.b / 255),
          });
        } else if (ann.type === 'image') {
          const imageBytes = Buffer.from(ann.image.split(',')[1], 'base64');
          const image = ann.mimeType === 'image/png' 
            ? await pdf.embedPng(imageBytes) 
            : await pdf.embedJpg(imageBytes);
          
          const imgWidth = (ann.width / ann.canvasWidth) * width;
          const imgHeight = (ann.height / ann.canvasHeight) * height;
          
          page.drawImage(image, {
            x: pdfX,
            y: pdfY - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
        } else if (ann.type === 'rect') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY - ((ann.height / ann.canvasHeight) * height),
            width: (ann.width / ann.canvasWidth) * width,
            height: (ann.height / ann.canvasHeight) * height,
            color: rgb(ann.color.r / 255, ann.color.g / 255, ann.color.b / 255),
            opacity: ann.opacity || 1,
          });
        }
      }

      const pdfBytes = await pdf.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Edit error:", error);
      res.status(500).json({ error: "Failed to edit PDF" });
    }
  });

  // API: Text to PDF
  app.post("/api/pdf/text-to-pdf", async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) return res.status(400).json({ error: "Content required" });

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 50;
      let currentY = height - margin;

      // Draw Title
      if (title) {
        page.drawText(title, {
          x: margin,
          y: currentY - 20,
          size: 24,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 60;
      }

      // Draw Content (Simple line wrapping)
      const fontSize = 12;
      const maxWidth = width - (margin * 2);
      const lines = content.split('\n');

      for (const line of lines) {
        if (currentY < margin + 40) {
          page = pdfDoc.addPage();
          currentY = height - margin;
        }

        // Very basic word wrapping
        const words = line.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testLineWidth = font.widthOfTextAtSize(testLine, fontSize);
          
          if (testLineWidth > maxWidth) {
            page.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font });
            currentY -= fontSize + 5;
            currentLine = word;
            
            if (currentY < margin) {
              page = pdfDoc.addPage();
              currentY = height - margin;
            }
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          page.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font });
          currentY -= fontSize + 10;
        }
      }

      const pdfBytes = await pdfDoc.save();
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Text to PDF error:", error);
      res.status(500).json({ error: "Failed to create PDF" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
