import html2canvas from 'html2canvas';

/**
 * Generates a PDF from a DOM element using the Image-in-PDF strategy.
 * This ensures that all fonts (including Chinese and Russian) are rendered correctly
 * without requiring heavy font files in the PDF generation process.
 * 
 * @param elementId The ID of the DOM element to export
 * @param fileName The desired file name (without extension)
 */
export async function generatePDF(elementId: string, fileName: string = 'training-plan') {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        // 1. Capture the element as a high-resolution canvas
        const canvas = await html2canvas(element, {
            scale: 2, // High resolution for print
            useCORS: true, // Allow loading cross-origin images (if any)
            logging: false,
            backgroundColor: '#ffffff', // Ensure white background
            // Force print styles if needed, or rely on existing CSS
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById(elementId);
                if (clonedElement) {
                    // Apply print-specific style adjustments here if needed
                    // e.g., clonedElement.style.padding = '20px';
                }
            }
        });

        // 2. Lazy load jsPDF to avoid initial bundle bloat
        const { jsPDF } = await import('jspdf');

        // 3. Calculate dimensions
        const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG is smaller than PNG
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'l' : 'p', // Auto-orientation
            unit: 'mm',
            format: 'a4'
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // 4. Add image to PDF
        // Should we split pages? For now, let's fit to one page or handle simple multi-page later.
        // If content is very long, it might stretch.
        // MVP: Fit width, if height > page, maybe just let it be long or scale down.
        // Detailed approach: Slice canvas? Too complex for now.
        // Let's rely on Fit-to-Width. If it overflows A4, we might need multiple pages.

        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        // Extra pages if needed
        while (heightLeft > 0) {
            position = heightLeft - pdfHeight; // Negative position to show bottom parts
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
        }

        // 5. Save or Share
        const pdfFile = pdf.output('blob');
        const file = new File([pdfFile], `${fileName}.pdf`, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: fileName,
                text: 'Your training plan from Jumpedia'
            });
        } else {
            pdf.save(`${fileName}.pdf`);
        }

    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to generate PDF. Please try again.');
    }
}
