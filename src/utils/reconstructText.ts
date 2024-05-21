export default function reconstructText(annotations: any): string {
    let text = '';
    annotations.pages.forEach((page: any) => {
      page.blocks.forEach((block: any) => {
        block.paragraphs.forEach((paragraph: any) => {
          paragraph.words.forEach((word: any) => {
            word.symbols.forEach((symbol: any) => {
              text += symbol.text;
              if (symbol.property && symbol.property.detectedBreak) {
                const breakType = symbol.property.detectedBreak.type;
                if (breakType === 'SPACE') {
                  text += ' ';
                } else if (breakType === 'LINE_BREAK') {
                  text += '\n';
                }
              }
            });
          });
          text += '\n'; // Paragraph break
        });
        text += '\n'; // Block break
      });
    });
    return text;
  }