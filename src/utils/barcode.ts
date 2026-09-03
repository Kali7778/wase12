// Code 128 (ISO/IEC 15417) Barcode Generator Utility
// Generates exact SVG bar dimensions for crisp rendering and physical scanner compatibility

const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0  ' '
  [2, 2, 2, 1, 2, 2], // 1  '!'
  [2, 2, 2, 2, 2, 1], // 2  '"'
  [1, 2, 1, 2, 2, 3], // 3  '#'
  [1, 2, 1, 3, 2, 2], // 4  '$'
  [1, 3, 1, 2, 2, 2], // 5  '%'
  [1, 2, 2, 2, 1, 3], // 6  '&'
  [1, 2, 2, 3, 1, 2], // 7  '\''
  [1, 3, 2, 2, 1, 2], // 8  '('
  [2, 2, 1, 2, 1, 3], // 9  ')'
  [2, 2, 1, 3, 1, 2], // 10 '*'
  [2, 3, 1, 2, 1, 2], // 11 '+'
  [1, 1, 2, 2, 3, 2], // 12 ','
  [1, 2, 2, 1, 3, 2], // 13 '-'
  [1, 2, 2, 2, 3, 1], // 14 '.'
  [1, 1, 3, 2, 2, 2], // 15 '/'
  [1, 2, 3, 1, 2, 2], // 16 '0'
  [1, 2, 3, 2, 2, 1], // 17 '1'
  [2, 2, 3, 2, 1, 1], // 18 '2'
  [2, 2, 1, 1, 3, 2], // 19 '3'
  [2, 2, 1, 2, 3, 1], // 20 '4'
  [2, 1, 3, 2, 1, 2], // 21 '5'
  [2, 2, 3, 1, 1, 2], // 22 '6'
  [3, 1, 2, 1, 3, 1], // 23 '7'
  [3, 1, 1, 2, 2, 2], // 24 '8'
  [3, 2, 1, 1, 2, 2], // 25 '9'
  [3, 2, 1, 2, 2, 1], // 26 ':'
  [3, 1, 2, 2, 1, 2], // 27 ';'
  [3, 2, 2, 1, 1, 2], // 28 '<'
  [3, 2, 2, 2, 1, 1], // 29 '='
  [2, 1, 2, 1, 2, 3], // 30 '>'
  [2, 1, 2, 3, 2, 1], // 31 '?'
  [2, 3, 2, 1, 2, 1], // 32 '@'
  [1, 1, 1, 3, 2, 3], // 33 'A'
  [1, 3, 1, 1, 2, 3], // 34 'B'
  [1, 3, 1, 3, 2, 1], // 35 'C'
  [1, 1, 2, 3, 1, 3], // 36 'D'
  [1, 3, 2, 1, 1, 3], // 37 'E'
  [1, 3, 2, 3, 1, 1], // 38 'F'
  [2, 1, 1, 3, 1, 3], // 39 'G'
  [2, 3, 1, 1, 1, 3], // 40 'H'
  [2, 3, 1, 3, 1, 1], // 41 'I'
  [1, 1, 2, 1, 3, 3], // 42 'J'
  [1, 1, 2, 3, 3, 1], // 43 'K'
  [1, 3, 2, 1, 3, 1], // 44 'L'
  [1, 1, 3, 1, 2, 3], // 45 'M'
  [1, 1, 3, 3, 2, 1], // 46 'N'
  [1, 3, 3, 1, 2, 1], // 47 'O'
  [3, 1, 3, 1, 2, 1], // 48 'P'
  [2, 1, 1, 3, 3, 1], // 49 'Q'
  [2, 3, 1, 1, 3, 1], // 50 'R'
  [2, 1, 3, 1, 1, 3], // 51 'S'
  [2, 1, 3, 3, 1, 1], // 52 'T'
  [2, 1, 3, 1, 3, 1], // 53 'U'
  [3, 1, 1, 1, 2, 3], // 54 'V'
  [3, 1, 1, 3, 2, 1], // 55 'W'
  [3, 3, 1, 1, 2, 1], // 56 'X'
  [3, 1, 2, 1, 1, 3], // 57 'Y'
  [3, 1, 2, 3, 1, 1], // 58 'Z'
  [3, 3, 2, 1, 1, 1], // 59 '['
  [3, 1, 4, 1, 1, 1], // 60 '\\'
  [2, 2, 1, 4, 1, 1], // 61 ']'
  [4, 3, 1, 1, 1, 1], // 62 '^'
  [1, 1, 1, 2, 2, 4], // 63 '_'
  [1, 1, 1, 4, 2, 2], // 64 '`'
  [1, 2, 1, 1, 2, 4], // 65 'a'
  [1, 2, 1, 4, 2, 1], // 66 'b'
  [1, 4, 1, 1, 2, 2], // 67 'c'
  [1, 4, 1, 2, 2, 1], // 68 'd'
  [1, 1, 2, 2, 1, 4], // 69 'e'
  [1, 1, 2, 4, 1, 2], // 70 'f'
  [1, 2, 2, 1, 1, 4], // 71 'g'
  [1, 2, 2, 4, 1, 1], // 72 'h'
  [1, 4, 2, 1, 1, 2], // 73 'i'
  [1, 4, 2, 2, 1, 1], // 74 'j'
  [2, 4, 1, 2, 1, 1], // 75 'k'
  [2, 2, 1, 1, 1, 4], // 76 'l'
  [4, 1, 3, 1, 1, 1], // 77 'm'
  [2, 4, 1, 1, 1, 2], // 78 'n'
  [1, 3, 4, 1, 1, 1], // 79 'o'
  [1, 1, 1, 2, 4, 2], // 80 'p'
  [1, 2, 1, 1, 4, 2], // 81 'q'
  [1, 2, 1, 2, 4, 1], // 82 'r'
  [1, 1, 4, 2, 1, 2], // 83 's'
  [1, 2, 4, 1, 1, 2], // 84 't'
  [1, 2, 4, 2, 1, 1], // 85 'u'
  [4, 1, 1, 2, 1, 2], // 86 'v'
  [4, 2, 1, 1, 1, 2], // 87 'w'
  [4, 2, 1, 2, 1, 1], // 88 'x'
  [2, 1, 2, 1, 4, 1], // 89 'y'
  [2, 1, 4, 1, 2, 1], // 90 'z'
  [4, 1, 2, 1, 2, 1], // 91 '{'
  [1, 1, 1, 1, 4, 3], // 92 '|'
  [1, 1, 1, 3, 4, 1], // 93 '}'
  [1, 3, 1, 1, 4, 1], // 94 '~'
  [1, 1, 4, 1, 1, 3], // 95 DEL
  [1, 1, 4, 3, 1, 1], // 96 FNC 3
  [4, 1, 1, 1, 1, 3], // 97 FNC 2
  [4, 1, 1, 3, 1, 1], // 98 SHIFT
  [1, 1, 3, 1, 4, 1], // 99 CODE C
  [1, 1, 4, 1, 3, 1], // 100 CODE B
  [3, 1, 1, 1, 4, 1], // 101 FNC 4
  [4, 1, 1, 1, 3, 1], // 102 FNC 1
  [2, 1, 1, 4, 1, 2], // 103 START A
  [2, 1, 1, 2, 1, 4], // 104 START B
  [2, 1, 1, 2, 3, 2], // 105 START C
  [2, 3, 3, 1, 1, 1, 2], // 106 STOP
];

export interface BarcodeBar {
  x: number;
  width: number;
  isBar: boolean;
}

/**
 * Encodes an alphanumeric string into Code 128 (Subset B) barcode bar sequences.
 */
export function encodeCode128(text: string, moduleWidth = 2): { bars: BarcodeBar[]; totalWidth: number } {
  if (!text) {
    text = '000000';
  }

  // Start with START B (index 104)
  const startCode = 104;
  const codes: number[] = [startCode];
  let checkSum = startCode;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // ASCII 32 (' ') to 126 ('~') mapped to Code 128 values 0 to 94
    let val = charCode - 32;
    if (val < 0 || val > 94) {
      val = 0; // fallback space
    }
    codes.push(val);
    checkSum += val * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(106); // Stop code

  // Quiet zone: 10 modules on each side
  const quietZoneModules = 10;
  let currentModuleX = quietZoneModules;
  const bars: BarcodeBar[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || [2, 1, 2, 2, 2, 2];
    for (let p = 0; p < pattern.length; p++) {
      const widthInModules = pattern[p];
      const isBar = p % 2 === 0;
      if (isBar) {
        bars.push({
          x: currentModuleX * moduleWidth,
          width: widthInModules * moduleWidth,
          isBar: true,
        });
      }
      currentModuleX += widthInModules;
    }
  }

  const totalWidth = (currentModuleX + quietZoneModules) * moduleWidth;
  return { bars, totalWidth };
}

/**
 * Formats barcode display with standardized prefixes
 */
export function formatBarcodeLabel(type: 'SO' | 'DN' | 'SKU', rawValue: string): { prefix: string; cleanValue: string; formatted: string } {
  const clean = (rawValue || '').trim();
  if (type === 'SO') {
    const formatted = clean.startsWith('SO-') || clean.startsWith('SO#') ? clean : `SO-${clean}`;
    return { prefix: 'SO', cleanValue: clean, formatted };
  }
  if (type === 'DN') {
    const formatted = clean.startsWith('DN-') || clean.startsWith('DN#') ? clean : `DN-${clean}`;
    return { prefix: 'DN', cleanValue: clean, formatted };
  }
  return { prefix: 'SKU', cleanValue: clean, formatted: clean };
}
