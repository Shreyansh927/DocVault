import Tesseract from "tesseract.js";
import sharp from "sharp";

export const tessractTextExtraction = async (file) => {
  try {
    const processedImage = await sharp(file.buffer)
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    const {
      data: { text },
    } = await Tesseract.recognize(processedImage, "eng");

    console.log("ocr text data:" + text);

    return text;
  } catch (err) {
    console.error("OCR Error:", err);

    return null;
  }
};
