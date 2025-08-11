// hooks/useEntitySearch.ts
import { useState, useCallback } from 'react';
import { useStores, EntityType } from '../stores';

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

  const generateReplacement = (type: EntityType, value: string): string => {
    switch (type) {
      case 'EMAIL':
        const [local, domain] = value.split('@');
        return `${local.replace(/./g, 'X')}@${domain.replace(/[^.]/g, 'X')}`;
      case 'PHONE':
        return value.replace(/\d/g, 'X');
      case 'DATE':
        return value.replace(/\d/g, 'X');
      case 'IBAN':
        return value.substring(0, 4) + value.substring(4).replace(/./g, 'X');
      case 'SIREN':
      case 'SIRET':
        return value.replace(/\d/g, 'X');
      case 'PERSON':
        return 'PERSONNE_XXX';
      case 'ADDRESS':
        return 'ADRESSE_XXX';
      case 'LOC':
        return 'LIEU_XXX';
      case 'ORG':
        return 'ORGANISATION_XXX';
      default:
        return 'XXX';
    }
  };

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
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        message: `Erreur lors de la recherche: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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