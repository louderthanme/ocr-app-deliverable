export default function reconstructText(annotations: any): string {
  let text = '';
  let currentParagraph = '';
  let currentLine = '';

  annotations.pages.forEach((page: any) => {
    page.blocks.forEach((block: any) => {
      block.paragraphs.forEach((paragraph: any) => {
        paragraph.words.forEach((word: any, wordIndex: number) => {
          word.symbols.forEach((symbol: any, symbolIndex: number) => {
            currentLine += symbol.text;

            if (symbol.property && symbol.property.detectedBreak) {
              const breakType = symbol.property.detectedBreak.type;
              if (breakType === 'SPACE') {
                currentLine += ' ';
              } else if (breakType === 'LINE_BREAK') {
                currentParagraph += currentLine.trim() + ' ';
                currentLine = '';
              }
            }
          });

          if (wordIndex < paragraph.words.length - 1 && (!word.property || !word.property.detectedBreak || word.property.detectedBreak.type !== 'SPACE')) {
            currentLine += ' ';
          }
        });

        currentParagraph += currentLine.trim() + ' ';
        currentLine = '';

        if (currentParagraph.trim().length > 0) {
          text += currentParagraph.trim() + '\n\n';
          currentParagraph = '';
        }
      });
    });
  });

  return text.trim();
}
