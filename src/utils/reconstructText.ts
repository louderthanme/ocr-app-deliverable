export default function reconstructText(annotations: any): string {
  let text = '';
  let currentParagraph = '';
  let currentLine = '';

  // Iterate through each page of annotations
  annotations.pages.forEach((page: any) => {
    // Iterate through each block of the page
    page.blocks.forEach((block: any) => {
      // Iterate through each paragraph of the block
      block.paragraphs.forEach((paragraph: any) => {
        // Iterate through each word of the paragraph
        paragraph.words.forEach((word: any, wordIndex: number) => {
          // Iterate through each symbol of the word
          word.symbols.forEach((symbol: any, symbolIndex: number) => {
            currentLine += symbol.text; // Append the symbol text to the current line

            // Handle detected breaks (e.g., space, line break)
            if (symbol.property && symbol.property.detectedBreak) {
              const breakType = symbol.property.detectedBreak.type;
              if (breakType === 'SPACE') {
                currentLine += ' '; // Add space if detected break is space
              } else if (breakType === 'LINE_BREAK') {
                currentParagraph += currentLine.trim() + ' '; // Add the current line to the current paragraph
                currentLine = ''; // Reset the current line
              }
            }
          });

          // Add a space between words if not the last word in the paragraph and if no detected break
          if (wordIndex < paragraph.words.length - 1 && (!word.property || !word.property.detectedBreak || word.property.detectedBreak.type !== 'SPACE')) {
            currentLine += ' ';
          }
        });

        currentParagraph += currentLine.trim() + ' '; // Add the current line to the current paragraph
        currentLine = ''; // Reset the current line

        // Add the current paragraph to the text and reset the current paragraph
        if (currentParagraph.trim().length > 0) {
          text += currentParagraph.trim() + '\n\n';
          currentParagraph = '';
        }
      });
    });
  });

  return text.trim(); // Return the cleaned-up text
}

/**
 * Disclaimer:
 * Due to the nature of OCR, the formatting can be inconsistent and it will almost invariably contain some styling oddities.
 * This function attempts to clean up and structure the text to make it better, but the result will probably still require manual adjustments.
 */
