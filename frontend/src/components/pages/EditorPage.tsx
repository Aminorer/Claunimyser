<div 
              className="mx-auto bg-white shadow-lg"
              style={{ 
                width: `${(210 * document.zoomLevel) / 100}mm`,
                minHeight: `${(297 * document.zoomLevel) / 100}mm`,
                transform: `scale(${document.zoomLevel / 100})`,
                transformOrigin: 'top center'
              }}
            >
              {/* Contenu simulé du document avec entités surlignées */}
              <div className="p-8 text-sm leading-6">
                <h1 className="text-xl font-bold mb-6">CONTRAT DE PRESTATION DE SERVICES</h1>
                
                <p className="mb-4">
                  Le présent contrat est conclu entre la société ABC CONSEIL, représentée par{' '}
                  <span 
                    className="px-1 border-2 border-blue-300 bg-blue-100 cursor-pointer hover:bg-blue-200"
                    onClick={() => {
                      const entity = filteredEntities.find(e => e.type === 'PERSON');
                      if (entity) handleEntityEdit(entity);
                    }}
                  >
                    {document.showOriginal ? 'Jean Dupont' : 'PERSONNE_XXX'}
                  </span>
                  , son directeur général, ci-après dénommée "le Prestataire".
                </p>

                <p className="mb-4">
                  Contact:{' '}
                  <span 
                    className="px-1 border-2 border-green-300 bg-green-100 cursor-pointer hover:bg-green-200"
                    onClick={() => {
                      const entity = filteredEntities.find(e => e.type === 'EMAIL');
                      if (entity) handleEntityEdit(entity);
                    }}
                  >
                    {document.showOriginal ? 'jean.dupont@example.com' : 'email@xxxxx.xxx'}
                  </span>
                  {' '}ou{' '}
                  <span 
                    className="px-1 border-2 border-yellow-300 bg-yellow-100 cursor-pointer hover:bg-yellow-200"
                    onClick={() => {
                      const entity = filteredEntities.find(e => e.type === 'PHONE');
                      if (entity) handleEntityEdit(entity);
                    }}
                  >
                    {document.showOriginal ? '06 12 34 56 78' : '0X XX XX XX XX'}
                  </span>import { useState, useCallback, useMemo } from 'react';
import { 
  FileText, Search, Users, Settings, Eye, EyeOff, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, Undo, Redo, Plus, Download, Filter,
  Edit3, Trash2, Group, MoreVertical, AlertCircle, CheckCircle,
  Brain, Zap, MapPin, Mail, Phone, Calendar, CreditCard, Building,
  X, Save
} from 'lucide-react';
import { useStores } from '../stores';
import { useDocumentProcessing } from '../hooks/useDocumentProcessing';
import { useEntitySearch } from '../hooks/useEntitySearch';
import { DetectedEntity, EntityType, TabType } from '../stores';

interface EditorProps {
  data?: {
    documentId: string;
    mode: 'regex' | 'ia';
  };
}

const EditorInterface = ({ data }: EditorProps) => {
  // Stores
  const { document, entities, ui } = useStores();
  const { exportDocument } = useDocumentProcessing();
  const { searchText, searchResults, isSearching, addSearchResultAsEntity } = useEntitySearch();
  
  // État local
  const [editingEntity, setEditingEntity] = useState<DetectedEntity | null>(null);

  // Configuration des types d'entités
  const entityConfig = {
    PERSON: { icon: Users, color: 'bg-blue-100 border-blue-300 text-blue-800', label: 'Personne' },
    EMAIL: { icon: Mail, color: 'bg-green-100 border-green-300 text-green-800', label: 'Email' },
    PHONE: { icon: Phone, color: 'bg-yellow-100 border-yellow-300 text-yellow-800', label: 'Téléphone' },
    ADDRESS: { icon: MapPin, color: 'bg-purple-100 border-purple-300 text-purple-800', label: 'Adresse' },
    DATE: { icon: Calendar, color: 'bg-orange-100 border-orange-300 text-orange-800', label: 'Date' },
    IBAN: { icon: CreditCard, color: 'bg-red-100 border-red-300 text-red-800', label: 'IBAN' },
    SIREN: { icon: Building, color: 'bg-indigo-100 border-indigo-300 text-indigo-800', label: 'SIREN' },
    SIRET: { icon: Building, color: 'bg-pink-100 border-pink-300 text-pink-800', label: 'SIRET' },
    ORG: { icon: Building, color: 'bg-gray-100 border-gray-300 text-gray-800', label: 'Organisation' },
    LOC: { icon: MapPin, color: 'bg-teal-100 border-teal-300 text-teal-800', label: 'Lieu' }
  };

  // Entités filtrées basées sur le store
  const filteredEntities = useMemo(() => {
    return entities.getFilteredEntities();
  }, [entities.entities, entities.confidenceThreshold]);

  // Statistiques
  const stats = useMemo(() => {
    return entities.getStats();
  }, [entities.entities, entities.groups]);

  // Handlers
  const handleEntityEdit = useCallback((entity: DetectedEntity) => {
    setEditingEntity(entity);
    ui.openEditModal(entity.id);
  }, [ui]);

  const handleEntityUpdate = useCallback((updatedEntity: DetectedEntity) => {
    entities.updateEntity(updatedEntity.id, updatedEntity);
    ui.closeEditModal();
    setEditingEntity(null);
  }, [entities, ui]);

  const handleEntityDelete = useCallback((entityId: string) => {
    entities.deleteEntity(entityId);
  }, [entities]);

  const handleSelectEntity = useCallback((entityId: string, isSelected: boolean) => {
    entities.selectEntity(entityId, isSelected);
  }, [entities]);

  const handleCreateGroup = useCallback(() => {
    if (entities.selectedEntities.length === 0) {
      ui.addNotification({
        type: 'warning',
        message: 'Sélectionnez des entités pour créer un groupe',
      });
      return;
    }
    
    const groupName = `Groupe ${entities.groups.length + 1}`;
    entities.createGroup(groupName, entities.selectedEntities);
    
    ui.addNotification({
      type: 'success',
      message: `Groupe "${groupName}" créé avec ${entities.selectedEntities.length} entité(s)`,
    });
  }, [entities, ui]);

  const handleSearch = useCallback((query: string) => {
    ui.setSearchQuery(query);
    if (query.trim()) {
      searchText(query, { mode: 'text' });
    }
  }, [ui, searchText]);

  const downloadDocument = useCallback(() => {
    exportDocument();
  }, [exportDocument]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar supérieure */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {document.processingMode === 'regex' ? (
                <Zap className="w-5 h-5 text-blue-600" />
              ) : (
                <Brain className="w-5 h-5 text-purple-600" />
              )}
              <span className="font-medium text-gray-900">
                {document.processingMode === 'regex' ? 'Mode Regex' : 'Mode IA'}
              </span>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                <Undo className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                <Redo className="w-4 h-4" />
              </button>
            </div>

            <button className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              <span>Ajouter détection</span>
            </button>

            <button 
              onClick={handleCreateGroup}
              disabled={entities.selectedEntities.length === 0}
              className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Group className="w-4 h-4" />
              <span>Créer groupe ({entities.selectedEntities.length})</span>
            </button>
          </div>

          <button
            onClick={() => document.toggleView()}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded border ${
              document.showOriginal 
                ? 'bg-orange-100 border-orange-300 text-orange-800' 
                : 'bg-gray-100 border-gray-300 text-gray-700'
            }`}
          >
            {document.showOriginal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{document.showOriginal ? 'Vue original' : 'Vue anonymisé'}</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex">
        {/* Zone document (70%) */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Toolbar document */}
          <div className="border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                    className="p-1 text-gray-600 hover:text-gray-900"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[50px] text-center">
                    {zoomLevel}%
                  </span>
                  <button 
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                    className="p-1 text-gray-600 hover:text-gray-900"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-600 hover:text-gray-900">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} / 3
                  </span>
                  <button className="p-1 text-gray-600 hover:text-gray-900">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Document_juridique.docx
              </div>
            </div>
          </div>

          {/* Visualisateur de document */}
          <div className="flex-1 p-8 overflow-auto bg-gray-100">
                </p>

                <p className="mb-4">
                  Et la société XYZ INDUSTRIE, ayant son siège social au{' '}
                  <span 
                    className="px-1 border-2 border-purple-300 bg-purple-100 cursor-pointer hover:bg-purple-200"
                    onClick={() => {
                      const entity = filteredEntities.find(e => e.type === 'ADDRESS');
                      if (entity) handleEntityEdit(entity);
                    }}
                  >
                    {document.showOriginal ? '123 Rue de la Paix, 75001 Paris' : 'XXX Rue XXXXX, XXXXX XXXXX'}
                  </span>
                  , ci-après dénommée "le Client".
                </p>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Article 1 - Objet du contrat</h2>
                  <p>Le présent contrat a pour objet la prestation de services de conseil...</p>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Article 2 - Durée</h2>
                  <p>Le contrat est conclu pour une durée de 12 mois...</p>
                </div>
              </div>
            </div>
                </p>

                <p className="mb-4">
                  Et la société XYZ INDUSTRIE, ayant son siège social au{' '}
                  <span 
                    className="px-1 border-2 border-purple-300 bg-purple-100 cursor-pointer hover:bg-purple-200"
                    onClick={() => handleEntityEdit(entities[3])}
                  >
                    123 Rue de la Paix, 75001 Paris
                  </span>
                  , ci-après dénommée "le Client".
                </p>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Article 1 - Objet du contrat</h2>
                  <p>Le présent contrat a pour objet la prestation de services de conseil...</p>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Article 2 - Durée</h2>
                  <p>Le contrat est conclu pour une durée de 12 mois...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panneau latéral (30%) */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Onglets */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'entities', label: 'Entités', icon: FileText },
                { id: 'groups', label: 'Groupes', icon: Users },
                { id: 'search', label: 'Recherche', icon: Search },
                { id: 'rules', label: 'Règles', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => ui.setActiveTab(id as TabType)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-3 text-sm font-medium border-b-2 ${
                    ui.activeTab === id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 overflow-auto">
            {/* Onglet Entités */}
            {ui.activeTab === 'entities' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Entités détectées</h3>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    {document.processingMode === 'ia' && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Confiance</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={entities.confidenceThreshold}
                          onChange={(e) => entities.setConfidenceThreshold(parseFloat(e.target.value))}
                          className="w-16"
                        />
                        <span className="text-xs text-gray-500">{Math.round(entities.confidenceThreshold * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredEntities.map((entity) => {
                    const config = entityConfig[entity.type];
                    const Icon = config.icon;
                    const isSelected = entities.selectedEntities.includes(entity.id);
                    
                    return (
                      <div
                        key={entity.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectEntity(entity.id, !isSelected)}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1"
                          />
                          
                          <Icon className="w-4 h-4 mt-1 text-gray-600" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
                                {config.label}
                              </span>
                              {entity.confidence && (
                                <span className="text-xs text-gray-500">
                                  {Math.round(entity.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 truncate">
                                {entity.value}
                              </div>
                              <div className="text-gray-500 truncate">
                                → {entity.replacement}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                Page {entity.page} • {entity.source.toUpperCase()}
                              </span>
                              
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEntityEdit(entity);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEntityDelete(entity.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Onglet Groupes */}
            {ui.activeTab === 'groups' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Groupes d'entités</h3>
                  <button className="flex items-center space-x-1 px-2 py-1 text-sm bg-blue-600 text-white rounded">
                    <Plus className="w-3 h-3" />
                    <span>Nouveau</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {entities.groups.map((group) => (
                    <div key={group.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{group.name}</h4>
                        <button 
                          onClick={() => entities.deleteGroup(group.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className={`text-xs px-2 py-1 rounded-full ${group.color} inline-block mb-2`}>
                        {group.entities.length} entité(s)
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Pattern: <code className="bg-gray-100 px-1 rounded">{group.replacementPattern}</code>
                      </div>
                      
                      <div className="space-y-1">
                        {group.entities.slice(0, 3).map((entityId) => {
                          const entity = entities.entities.find(e => e.id === entityId);
                          return entity ? (
                            <div key={entityId} className="text-xs text-gray-500 truncate">
                              • {entity.value}
                            </div>
                          ) : null;
                        })}
                        {group.entities.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{group.entities.length - 3} autres...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Onglet Recherche */}
            {ui.activeTab === 'search' && (
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Recherche dans le document</h3>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Rechercher du texte..."
                      value={ui.searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        Texte simple
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        Regex
                      </button>
                    </div>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Résultats ({searchResults.length})
                    </h4>
                    
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div key={result.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              Page {result.page}
                            </span>
                            <button 
                              onClick={() => addSearchResultAsEntity(result, 'PERSON')}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Ajouter comme entité
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">{result.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Onglet Règles */}
            {ui.activeTab === 'rules' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Configuration des règles</h3>
                
                <div className="space-y-4">
                  {document.processingMode === 'regex' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Patterns Regex personnalisés</h4>
                      <textarea
                        placeholder="Ajouter vos patterns regex..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={4}
                      />
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Styles d'anonymisation</h4>
                    <div className="space-y-2">
                      {Object.entries(entityConfig).map(([type, config]) => (
                        <div key={type} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <div className="flex items-center space-x-2">
                            <config.icon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{config.label}</span>
                          </div>
                          <select className="text-xs border border-gray-300 rounded px-2 py-1">
                            <option>Masquage</option>
                            <option>Pseudonymisation</option>
                            <option>Remplacement</option>
                            <option>Suppression</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>auto">
            {/* Onglet Entités */}
            {activeTab === 'entities' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Entités détectées</h3>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    {processingMode === 'ia' && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Confiance</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={confidenceThreshold}
                          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                          className="w-16"
                        />
                        <span className="text-xs text-gray-500">{Math.round(confidenceThreshold * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredEntities.map((entity) => {
                    const config = entityConfig[entity.type];
                    const Icon = config.icon;
                    const isSelected = selectedEntities.includes(entity.id);
                    
                    return (
                      <div
                        key={entity.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectEntity(entity.id, !isSelected)}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1"
                          />
                          
                          <Icon className="w-4 h-4 mt-1 text-gray-600" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
                                {config.label}
                              </span>
                              {entity.confidence && (
                                <span className="text-xs text-gray-500">
                                  {Math.round(entity.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 truncate">
                                {entity.value}
                              </div>
                              <div className="text-gray-500 truncate">
                                → {entity.replacement}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                Page {entity.page} • {entity.source.toUpperCase()}
                              </span>
                              
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEntityEdit(entity);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEntityDelete(entity.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Onglet Groupes */}
            {activeTab === 'groups' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Groupes d'entités</h3>
                  <button className="flex items-center space-x-1 px-2 py-1 text-sm bg-blue-600 text-white rounded">
                    <Plus className="w-3 h-3" />
                    <span>Nouveau</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{group.name}</h4>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className={`text-xs px-2 py-1 rounded-full ${group.color} inline-block mb-2`}>
                        {group.entities.length} entité(s)
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Pattern: <code className="bg-gray-100 px-1 rounded">{group.replacementPattern}</code>
                      </div>
                      
                      <div className="space-y-1">
                        {group.entities.slice(0, 3).map((entityId) => {
                          const entity = entities.find(e => e.id === entityId);
                          return entity ? (
                            <div key={entityId} className="text-xs text-gray-500 truncate">
                              • {entity.value}
                            </div>
                          ) : null;
                        })}
                        {group.entities.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{group.entities.length - 3} autres...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Onglet Recherche */}
            {activeTab === 'search' && (
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Recherche dans le document</h3>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Rechercher du texte..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        Texte simple
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        Regex
                      </button>
                      {processingMode === 'ia' && (
                        <button className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                          Sémantique
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Résultats ({searchResults.length})
                    </h4>
                    
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div key={result.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              Page {result.page}
                            </span>
                            <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                              Ajouter comme entité
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">{result.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Onglet Règles */}
            {activeTab === 'rules' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Configuration des règles</h3>
                
                <div className="space-y-4">
                  {processingMode === 'regex' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Patterns Regex personnalisés</h4>
                      <textarea
                        placeholder="Ajouter vos patterns regex..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={4}
                      />
                    </div>
                  )}
                  
                  {processingMode === 'ia' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Paramètres du modèle NER</h4>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Seuil de confiance global</span>
                          <input type="number" min="0" max="1" step="0.1" className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Post-traitement regex</span>
                          <input type="checkbox" className="rounded" />
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Styles d'anonymisation</h4>
                    <div className="space-y-2">
                      {Object.entries(entityConfig).map(([type, config]) => (
                        <div key={type} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <div className="flex items-center space-x-2">
                            <config.icon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{config.label}</span>
                          </div>
                          <select className="text-xs border border-gray-300 rounded px-2 py-1">
                            <option>Masquage</option>
                            <option>Pseudonymisation</option>
                            <option>Remplacement</option>
                            <option>Suppression</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de statut */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span>Total: {stats.total} entités</span>
            <span>Modifiées: {stats.modified}</span>
            <span>Groupes: {stats.groups}</span>
            <span>Couverture: {stats.coverage}%</span>
          </div>
          
          <button
            onClick={downloadDocument}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger DOCX Anonymisé</span>
          </button>
        </div>
      </div>

      {/* Modal d'édition d'entité */}
      {ui.isEditModalOpen && editingEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Éditer l'entité</h3>
              <button
                onClick={() => ui.closeEditModal()}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'entité
                </label>
                <select 
                  value={editingEntity.type}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.entries(entityConfig).map(([type, config]) => (
                    <option key={type} value={type}>{config.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur originale
                </label>
                <input
                  type="text"
                  value={editingEntity.value}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur de remplacement
                </label>
                <input
                  type="text"
                  value={editingEntity.replacement}
                  onChange={(e) => setEditingEntity(prev => prev ? {...prev, replacement: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              {editingEntity.confidence && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score de confiance
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${editingEntity.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {Math.round(editingEntity.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => ui.closeEditModal()}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => editingEntity && handleEntityUpdate(editingEntity)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorInterface;