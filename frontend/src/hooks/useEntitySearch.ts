import { useState, useCallback } from 'react';
import { useStores } from '../stores';

interface SearchResult {
  id: string;
  text: string;
  page: number;
  position: number;
  context: string;
}

export const useEntitySearch = () => {
  const { document, entities, ui } = useStores();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchText = useCallback(async (
    query: string,
    options: {
      mode: 'text' | 'regex';
      caseSensitive?: boolean;
    } = { mode: 'text' }
  ) => {
    if (!query.trim() || !document.currentDoc) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const content = document.currentDoc.content;
      const results: SearchResult[] = [];
      
      let searchRegex: RegExp;
      
      if (options.mode === 'regex') {
        try {
          searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
        } catch (error) {
          ui.addNotification({
            type: 'error',
            message: 'Expression régulière invalide',
          });
          return;
        }
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\  const searchText = useCallback(async (
    query: string,
    options: {
      mode: 'text' | 'regex';
      caseSensitive?: boolean;
    } = { mode: 'text' }
  ) => {
    if (!query.');
        searchRegex = new RegExp(escapedQuery, options.caseSensitive ? 'g' : 'gi');
      }

      let match;
      let resultId = 0;
      
      while ((match = searchRegex.exec(content)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(start, end);
        
        results.push({
          id: `search_${++resultId}`,
          text: match[0],
          page: Math.ceil(match.index / 3000),
          position: match.index,
          context: context,
        });

        // Limiter les résultats pour éviter les performances dégradées
        if (results.length >= 100) break;
      }

      setSearchResults(results);
      
      ui.addNotification({
        type: 'info',
        message: `${results.length} résultat(s) trouvé(s)`,
      });

    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: `Erreur lors de la recherche: ${error.message}`,
      });
    } finally {
      setIsSearching(false);
    }
  }, [document.currentDoc, ui]);

  const addSearchResultAsEntity = useCallback((
    result: SearchResult,
    entityType: EntityType
  ) => {
    const newEntity = {
      type: entityType,
      value: result.text,
      replacement: generateReplacement(entityType, result.text),
      source: 'manual' as const,
      page: result.page,
      isModified: false,
    };

    entities.addEntity(newEntity);
    
    ui.addNotification({
      type: 'success',
      message: `Entité "${result.text}" ajoutée`,
    });
  }, [entities, ui]);

  return {
    searchText,
    searchResults,
    isSearching,
    addSearchResultAsEntity,
  };
};