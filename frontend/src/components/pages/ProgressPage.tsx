import { useState, useEffect } from 'react';
import { CheckCircle, Clock, FileText, Brain, Zap, AlertCircle, Shield, Loader2 } from 'lucide-react';

// Types
type ProcessingStep = 'upload' | 'reading' | 'analysis' | 'interface' | 'complete';
type ProcessingMode = 'regex' | 'ia';

interface ProcessingState {
  currentStep: ProcessingStep;
  progress: number;
  entitiesDetected: number;
  estimatedTime: number;
  elapsedTime: number;
  mode: ProcessingMode;
  filename: string;
  currentOperation: string;
}

const ProgressPage = () => {
  const [state, setState] = useState<ProcessingState>({
    currentStep: 'upload',
    progress: 0,
    entitiesDetected: 0,
    estimatedTime: 45,
    elapsedTime: 0,
    mode: 'regex', // Serait passé en paramètre dans une vraie app
    filename: 'Document_juridique.docx', // Serait passé en paramètre
    currentOperation: 'Vérification du fichier...'
  });

  const steps = {
    upload: { 
      label: 'Upload', 
      icon: FileText, 
      duration: 2000,
      operations: ['Vérification du fichier...', 'Validation du format...', 'Upload terminé']
    },
    reading: { 
      label: 'Lecture document', 
      icon: FileText, 
      duration: 3000,
      operations: ['Extraction du contenu...', 'Préservation de la structure...', 'Mapping des positions...']
    },
    analysis: { 
      label: 'Analyse', 
      icon: state.mode === 'regex' ? Zap : Brain, 
      duration: state.mode === 'regex' ? 4000 : 8000,
      operations: state.mode === 'regex' 
        ? ['Recherche patterns regex...', 'Détection entités...', 'Classification des résultats...']
        : ['Initialisation modèle NER...', 'Analyse sémantique...', 'Calcul des scores de confiance...', 'Post-traitement regex...']
    },
    interface: { 
      label: 'Interface interactive', 
      icon: Shield, 
      duration: 2000,
      operations: ['Préparation de l\'interface...', 'Génération des surlignages...', 'Prêt pour l\'édition']
    },
    complete: { 
      label: 'Terminé', 
      icon: CheckCircle, 
      duration: 0,
      operations: ['Traitement terminé']
    }
  };

  const stepOrder: ProcessingStep[] = ['upload', 'reading', 'analysis', 'interface', 'complete'];

  // Simulation du traitement
  useEffect(() => {
    const processDocument = async () => {
      for (let i = 0; i < stepOrder.length; i++) {
        const step = stepOrder[i];
        const stepConfig = steps[step];
        
        setState(prev => ({
          ...prev,
          currentStep: step,
          currentOperation: stepConfig.operations[0]
        }));

        if (step === 'complete') {
          setState(prev => ({
            ...prev,
            progress: 100,
            currentOperation: 'Traitement terminé'
          }));
          
          // Redirection après 1 seconde
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('navigate', { 
              detail: { page: 'editor', data: { documentId: 'doc_123', mode: state.mode } }
            }));
          }, 1000);
          break;
        }

        // Animation du progrès pour cette étape
        const stepProgress = 100 / (stepOrder.length - 1);
        const startProgress = i * stepProgress;
        const endProgress = (i + 1) * stepProgress;
        
        // Opérations de l'étape
        for (let j = 0; j < stepConfig.operations.length; j++) {
          const operation = stepConfig.operations[j];
          const operationDuration = stepConfig.duration / stepConfig.operations.length;
          
          setState(prev => ({
            ...prev,
            currentOperation: operation
          }));

          // Animation du progrès pendant l'opération
          const progressIncrement = stepProgress / stepConfig.operations.length;
          const operationStartProgress = startProgress + (j * progressIncrement);
          const operationEndProgress = startProgress + ((j + 1) * progressIncrement);
          
          await new Promise(resolve => {
            const animationInterval = setInterval(() => {
              setState(prev => {
                const newProgress = Math.min(
                  operationEndProgress,
                  prev.progress + 1
                );
                
                // Simulation détection d'entités pendant l'analyse
                let newEntities = prev.entitiesDetected;
                if (step === 'analysis' && Math.random() > 0.7) {
                  newEntities += Math.floor(Math.random() * 3);
                }
                
                if (newProgress >= operationEndProgress) {
                  clearInterval(animationInterval);
                  resolve(null);
                }
                
                return {
                  ...prev,
                  progress: newProgress,
                  entitiesDetected: Math.min(newEntities, state.mode === 'regex' ? 45 : 127),
                  elapsedTime: prev.elapsedTime + 0.1,
                  estimatedTime: Math.max(5, prev.estimatedTime - 0.2)
                };
              });
            }, 100);
          });
        }
      }
    };

    processDocument();
  }, []);

  const getStepStatus = (step: ProcessingStep) => {
    const currentIndex = stepOrder.indexOf(state.currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const modeConfig = {
    regex: {
      icon: Zap,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      name: 'Analyse Simple (Regex)'
    },
    ia: {
      icon: Brain,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      name: 'Analyse IA (NER + Regex)'
    }
  };

  const currentModeConfig = modeConfig[state.mode];
  const ModeIcon = currentModeConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête avec mode sélectionné */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-full ${currentModeConfig.bgColor} mb-4`}>
            <ModeIcon className={`w-6 h-6 ${currentModeConfig.textColor}`} />
            <span className={`font-medium ${currentModeConfig.textColor}`}>
              {currentModeConfig.name}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Traitement en cours
          </h1>
          <p className="text-lg text-gray-600">
            {state.filename}
          </p>
        </div>

        {/* Barre de progression principale */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progression globale
              </span>
              <span className="text-sm font-medium text-gray-700">
                {Math.round(state.progress)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${currentModeConfig.color} transition-all duration-300 ease-out`}
                style={{ width: `${state.progress}%` }}
              >
                <div className="h-full bg-white bg-opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Étapes de traitement */}
          <div className="space-y-4">
            {stepOrder.slice(0, -1).map((step, index) => {
              const stepConfig = steps[step];
              const status = getStepStatus(step);
              const StepIcon = stepConfig.icon;
              
              return (
                <div key={step} className="flex items-center space-x-4">
                  {/* Icône d'étape */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    status === 'completed' 
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : status === 'active'
                      ? `bg-gradient-to-r ${currentModeConfig.color} border-transparent text-white`
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : status === 'active' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Contenu de l'étape */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${
                        status === 'active' ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {stepConfig.label}
                      </h3>
                      
                      {status === 'completed' && (
                        <span className="text-sm text-green-600 font-medium">
                          Terminé
                        </span>
                      )}
                    </div>
                    
                    {status === 'active' && (
                      <p className="text-sm text-gray-500 mt-1 animate-pulse">
                        {state.currentOperation}
                      </p>
                    )}
                  </div>

                  {/* Ligne de connexion */}
                  {index < stepOrder.length - 2 && (
                    <div className={`absolute left-5 mt-10 w-0.5 h-8 ${
                      getStepStatus(stepOrder[index + 1]) !== 'pending' 
                        ? 'bg-green-300' 
                        : 'bg-gray-300'
                    }`} style={{ marginLeft: '1.25rem' }}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Informations temps réel */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Entités détectées */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`p-3 rounded-full bg-gradient-to-r ${currentModeConfig.color}`}>
                <ModeIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {state.entitiesDetected}
            </h3>
            <p className="text-gray-600">Entités détectées</p>
            {state.currentStep === 'analysis' && (
              <div className="mt-2 flex items-center justify-center space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>

          {/* Temps écoulé */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(state.elapsedTime)}
            </h3>
            <p className="text-gray-600">Temps écoulé</p>
          </div>

          {/* Temps estimé restant */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-green-600">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(state.estimatedTime)}
            </h3>
            <p className="text-gray-600">Temps restant estimé</p>
          </div>
        </div>

        {/* Message important */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                Préservation du format original en cours...
              </h3>
              <p className="text-blue-700 text-sm leading-relaxed">
                Votre document est traité avec soin pour conserver intégralement sa mise en page, 
                ses polices, ses images et tous ses éléments de formatage. Seules les entités 
                identifiées seront modifiables dans l'interface d'édition.
              </p>
            </div>
          </div>
        </div>

        {/* Indicateur de complétion */}
        {state.currentStep === 'complete' && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-green-100 text-green-800 rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                Traitement terminé - Redirection en cours...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;