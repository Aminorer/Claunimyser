export const REGEX_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /(?:\+33|0)[1-9](?:[.\-\s]?\d{2}){4}/g,
  IBAN: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,16}\b/g,
  SIREN: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
  SIRET: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g,
  DATE: /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g,
  ADDRESS: /\b\d+[\w\s,.-]+(?:\d{5}|\b(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille)\b)/gi,
  LOC: /\b(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille|France)\b/gi,
};

export class EntityExtractor {
  static extractWithRegex(text: string): DetectedEntity[] {
    const entities: DetectedEntity[] = [];
    let idCounter = 0;

    Object.entries(REGEX_PATTERNS).forEach(([type, pattern]) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `regex_${type.toLowerCase()}_${++idCounter}`,
          type: type as any,
          value: match[0],
          replacement: this.generateReplacement(type as any, match[0]),
          source: 'regex',
          positions: [{
            page: Math.ceil(match.index / 3000), // Estimation de page
            start: match.index,
            end: match.index + match[0].length,
          }],
          page: Math.ceil(match.index / 3000),
          isModified: false,
          createdAt: new Date(),
        });
      }
    });

    return entities;
  }

  private static generateReplacement(type: string, value: string): string {
    const replacements = {
      EMAIL: () => `${value.split('@')[0].replace(/./g, 'X')}@${value.split('@')[1].replace(/[^.]/g, 'X')}`,
      PHONE: () => value.replace(/\d/g, 'X'),
      IBAN: () => value.substring(0, 4) + value.substring(4).replace(/./g, 'X'),
      SIREN: () => value.replace(/\d/g, 'X'),
      SIRET: () => value.replace(/\d/g, 'X'),
      DATE: () => value.replace(/\d/g, 'X'),
      ADDRESS: () => value.replace(/\d+/g, 'XXX').replace(/[A-Za-z]/g, 'X'),
      LOC: () => 'LIEU_XXX',
      PERSON: () => 'PERSONNE_XXX',
      ORG: () => 'ORGANISATION_XXX',
    };

    const generator = replacements[type as keyof typeof replacements];
    return generator ? generator() : 'XXX';
  }
}