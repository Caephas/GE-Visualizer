/** Genome representation helpers: codons <-> bit strings (MSB-first). */

export function bitsToCodons(bits: number[], bitsPerCodon: number): number[] {
  const fullBits = bits.length - (bits.length % bitsPerCodon);
  const codons: number[] = [];
  for (let start = 0; start < fullBits; start += bitsPerCodon) {
    let value = 0;
    for (let offset = 0; offset < bitsPerCodon; offset += 1) {
      value = (value << 1) | bits[start + offset];
    }
    codons.push(value);
  }
  return codons;
}

export function codonsToBits(codons: number[], bitsPerCodon: number): number[] {
  const bits: number[] = [];
  for (const codon of codons) {
    for (let shift = bitsPerCodon - 1; shift >= 0; shift -= 1) {
      bits.push((codon >> shift) & 1);
    }
  }
  return bits;
}

export function randomGenome(length: number, codonSize: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * codonSize));
}
