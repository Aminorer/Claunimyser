import { useState, useCallback } from 'react';
import { Upload, FileText, Brain, Zap, CheckCircle, AlertCircle, X } from 'lucide-react';

// Types
type ProcessingMode = 'regex' | 'ia';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

const UploadPage = () => {
  const [selectedMode, setSelectedMode] = useState<ProcessingMode>('regex');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Configuration des modes
  const modes = {
    regex: {
      title: 'Analyse Simple (Regex)',
      icon: Zap,
      description: '8 types d\'entités détectées',
      entities: ['LOC', 'ADDRESS', 'EMAIL', 'PHONE', 'DATE', 'IBAN', 'SIREN', 'SIRET'],
      speed: 'Rapide',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50'
    },
    ia: {
      title: 'Analyse IA (NER + Regex)',
      icon: Brain,
      description: 'Toutes entités juridiques avec confiance ajustable',
      entities: ['Toutes entités juridiques', 'Confiance paramétrable', 'Détection avancée'],
      speed: 'Précis',
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50'
    }
  };

  // Validation des fichiers
  const validateFile = (file: File): string | null => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > maxSize) {
      return 'Le fichier dépasse la limite de 25MB';
    }
    
    if (!allowedTypes.includes(file.type)) {
      return 'Format non supporté. Utilisez PDF ou DOCX uniquement';
    }
    
    return null;
  };

  // Gestion du drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      setErrorMessage('Un seul document peut être traité à la fois');
      return;
    }
    
    if (files.length === 1) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Traitement du fichier uploadé
  const processFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadStatus('error');
      return;
    }

    setErrorMessage('');
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    // Simulation de l'upload avec progress
    const uploadSimulation = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadSimulation);
          setUploadStatus('success');
          setUploadedFile({
            name: file.name,
            size: file.size,
            type: file.type
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  const handleProcessDocument = () => {
    if (!uploadedFile) return;
    
    // Simulation de redirection vers page de progression
    console.log(`Traitement du document ${uploadedFile.name} en mode ${selectedMode}`);
    // Simulation de navigation - à remplacer par React Router
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: { page: 'progress', data: { file: uploadedFile, mode: selectedMode } }
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Anonymiseur de documents juridiques
          </h1>
          <p className="text-lg text-gray-600">
            Analysez et anonymisez vos documents en préservant leur format original
          </p>
        </div>

        {/* Sélecteur de mode */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Choisissez votre mode d'analyse
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(modes).map(([key, mode]) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === key;
              
              return (
                <div
                  key={key}
                  onClick={() => setSelectedMode(key as ProcessingMode)}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                    isSelected 
                      ? `${mode.borderColor} ${mode.bgColor} shadow-lg` 
                      : 'border-gray-200 bg-white hover:border-gray-300 shadow-md'
                  }`}
                >
                  {/* Badge de sélection */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${mode.color} shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {mode.title}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {mode.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Vitesse:</span>
                          <span className={`text-sm font-medium ${isSelected ? 'text-gray-800' : 'text-gray-600'}`}>
                            {mode.speed}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <strong>Entités détectées:</strong>
                          <ul className="mt-1 space-y-1">
                            {mode.entities.slice(0, 3).map((entity, idx) => (
                              <li key={idx} className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                <span>{entity}</span>
                              </li>
                            ))}
                            {mode.entities.length > 3 && (
                              <li className="text-gray-500">
                                +{mode.entities.length - 3} autres...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone d'upload */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Téléchargez votre document
          </h2>

          {!uploadedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Glissez-déposez votre document ici
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ou cliquez pour sélectionner un fichier
                  </p>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>• Formats acceptés: PDF, DOCX</p>
                    <p>• Taille maximum: 25MB</p>
                    <p>• Un seul document à la fois</p>
                  </div>
                </div>
                
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  Sélectionner un fichier
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Fichier uploadé */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                    <p className="text-sm text-gray-600">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                </div>
                
                <button
                  onClick={removeFile}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress bar pendant l'upload */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Upload en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Bouton de traitement */}
              {uploadStatus === 'success' && (
                <div className="text-center">
                  <button
                    onClick={handleProcessDocument}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Commencer l'analyse ({modes[selectedMode].title})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Informations sur le format de sortie */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-white rounded-lg shadow-md">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-gray-700">
              <strong>Format de sortie:</strong> DOCX identique au document original
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;