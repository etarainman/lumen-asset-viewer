
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up the worker
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Converts the first page of a PDF file to a high-resolution image Data URL (Base64).
 * using JPEG format to save space in LocalStorage.
 * @param file The PDF file object
 * @param scale The geometric scale factor (default 1.5 for balance between quality and size)
 * @returns Promise resolving to the Data URL string
 */
export const convertPdfToImage = async (file: File, scale = 1.5): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
        throw new Error("PDF has no pages");
    }

    // Fetch the first page
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale });

    // Prepare canvas using PDF page dimensions
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error("Canvas context not available");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render white background first (for JPEG)
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render PDF page into canvas context
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    // Return Data URL (JPEG 0.7 quality)
    return canvas.toDataURL('image/jpeg', 0.7);
};
