export class DocumentRenderer {
  static highlightEntities(
    content: string,
    entities: DetectedEntity[],
    entityConfig: any
  ): string {
    // Trier les entités par position pour éviter les conflits de surlignage
    const sortedEntities = [...entities].sort((a, b) => b.positions[0].start - a.positions[0].start);
    
    let highlightedContent = content;
    
    sortedEntities.forEach((entity) => {
      const config = entityConfig[entity.type];
      entity.positions.forEach((pos) => {
        const before = highlightedContent.substring(0, pos.start);
        const entityText = highlightedContent.substring(pos.start, pos.end);
        const after = highlightedContent.substring(pos.end);
        
        const highlightedText = `<span class="entity-highlight ${config.color}" data-entity-id="${entity.id}" data-entity-type="${entity.type}">${entityText}</span>`;
        
        highlightedContent = before + highlightedText + after;
      });
    });
    
    return highlightedContent;
  }

  static generateAnonymizedContent(
    content: string,
    entities: DetectedEntity[]
  ): string {
    // Trier les entités par position (en ordre décroissant pour éviter les décalages)
    const sortedEntities = [...entities].sort((a, b) => b.positions[0].start - a.positions[0].start);
    
    let anonymizedContent = content;
    
    sortedEntities.forEach((entity) => {
      entity.positions.forEach((pos) => {
        const before = anonymizedContent.substring(0, pos.start);
        const after = anonymizedContent.substring(pos.end);
        
        anonymizedContent = before + entity.replacement + after;
      });
    });
    
    return anonymizedContent;
  }
}