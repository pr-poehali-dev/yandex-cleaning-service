import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { City } from '@/data/russian-cities';
import SourceStep from '@/components/clustering/SourceStep';
import CitiesStep from '@/components/clustering/CitiesStep';
import GoalStep from '@/components/clustering/GoalStep';
import IntentsStep from '@/components/clustering/IntentsStep';
import ProcessingStep from '@/components/clustering/ProcessingStep';
import ResultsStep from '@/components/clustering/ResultsStep';
import StepIndicator from '@/components/clustering/StepIndicator';
import WordstatDialog from '@/components/clustering/WordstatDialog';
import { 
  generateClustersFromKeywords, 
  generateMinusWords, 
  PROCESSING_STAGES 
} from '@/components/clustering/ClusteringHelpers';

const API_URL = 'https://functions.poehali.dev/06df3397-13af-46f0-946a-f5d38aa6f60f';
const WORDSTAT_API_URL = 'https://functions.poehali.dev/8b141446-430c-4c0b-b347-a0a2057c0ee8';

type Step = 'source' | 'wordstat-dialog' | 'cities' | 'goal' | 'intents' | 'processing' | 'results';
type Source = 'manual' | 'website';
type Goal = 'context' | 'seo';

interface Phrase {
  phrase: string;
  count: number;
}

interface Cluster {
  name: string;
  intent: string;
  color: string;
  icon: string;
  phrases: Phrase[];
}

export default function TestClustering() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('manual');
  const [manualKeywords, setManualKeywords] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  const [useGeoKeys, setUseGeoKeys] = useState(false);
  const [wordstatQuery, setWordstatQuery] = useState('');
  const [isWordstatLoading, setIsWordstatLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [goal, setGoal] = useState<Goal>('context');
  const [selectedIntents, setSelectedIntents] = useState<string[]>(['commercial', 'transactional']);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusWords, setMinusWords] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      const userId = localStorage.getItem('userId');
      if (!userId) {
        toast.error('Ошибка: пользователь не авторизован');
        navigate('/');
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}?endpoint=projects&id=${projectId}`, {
          headers: {
            'X-User-Id': userId
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project');
        }

        const project = await response.json();
        console.log('📦 Loaded project:', project);
        console.log('📦 Project results:', project.results);
        console.log('📦 Has clusters?', project.results?.clusters?.length);
        
        if (project) {
          setProjectName(project.name || '');
          
          if (project.results && project.results.clusters && project.results.clusters.length > 0) {
            console.log('✅ SHOWING RESULTS PAGE! Clusters:', project.results.clusters.length);
            console.log('🔍 First cluster from DB:', project.results.clusters[0]);
            console.log('🔍 First phrase from DB:', project.results.clusters[0]?.phrases?.[0]);
            setClusters(project.results.clusters);
            setMinusWords(project.results.minusWords || []);
            setStep('results');
          } else {
            console.log('❌ No results - showing source step');
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Не удалось загрузить проект');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId, navigate]);

  const saveResultsToAPI = useCallback(async (clustersData: Cluster[], minusWordsData: string[]) => {
    console.log('🔥 saveResultsToAPI CALLED', {
      projectId,
      clustersCount: clustersData.length,
      minusWordsCount: minusWordsData.length
    });
    
    if (!projectId) {
      console.error('❌ No projectId provided');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('❌ No userId found');
      toast.error('Ошибка: пользователь не авторизован');
      return;
    }

    try {
      console.log('💾 Sending results to API...');
      const response = await fetch(`${API_URL}?endpoint=projects`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          id: parseInt(projectId),
          results: {
            clusters: clustersData,
            minusWords: minusWordsData
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save results');
      }

      const result = await response.json();
      console.log('✅ Results saved successfully:', result);
      toast.success('Результаты сохранены');
    } catch (error) {
      console.error('❌ Error saving results:', error);
      toast.error('Не удалось сохранить результаты');
    }
  }, [projectId]);

  useEffect(() => {
    if (step === 'processing') {
      let totalDuration = 0;
      let currentProgress = 0;

      PROCESSING_STAGES.forEach((stage, idx) => {
        setTimeout(() => {
          setCurrentStage(idx);
          const increment = 100 / PROCESSING_STAGES.length;
          currentProgress += increment;
          setProcessingProgress(Math.min(currentProgress, 100));

          if (idx === PROCESSING_STAGES.length - 1) {
            setTimeout(async () => {
              const keywords = manualKeywords
                .split('\n')
                .map(k => k.trim())
                .filter(k => k.length > 0);

              const generatedClusters = generateClustersFromKeywords(keywords, selectedIntents);
              const generatedMinusWords = generateMinusWords(keywords);
              
              console.log('🎯 Generated clusters:', generatedClusters);
              console.log('🎯 Generated minus words:', generatedMinusWords);
              
              setClusters(generatedClusters);
              setMinusWords(generatedMinusWords);
              
              await saveResultsToAPI(generatedClusters, generatedMinusWords);
              
              setStep('results');
              toast.success('Готово! Кластеры созданы, минус-слова выделены');
            }, stage.duration);
          }
        }, totalDuration);
        totalDuration += stage.duration;
      });
    }
  }, [step, manualKeywords, selectedIntents, saveResultsToAPI]);

  const handleWordstatSubmit = async (query: string, cities: City[], mode: string) => {
    setIsWordstatLoading(true);
    
    try {
      const regionIds = cities.map(c => c.id);
      
      const response = await fetch(WORDSTAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keywords: [query],
          regions: regionIds,
          mode: mode,
          use_openai: true
        })
      });

      if (!response.ok) {
        throw new Error('Wordstat request failed');
      }

      const data = await response.json();
      console.log('📦 Full response:', data);
      
      const searchQuery = data.data?.SearchQuery?.[0];
      if (!searchQuery || !searchQuery.Clusters) {
        throw new Error('Invalid response format');
      }
      
      const clusters = searchQuery.Clusters;
      const minusWords = searchQuery.MinusWords || {};
      
      console.log('✅ Received clusters from Wordstat:', clusters.length);
      console.log('🔍 First cluster:', clusters[0]);
      
      const transformedClusters = clusters.map((cluster: any, idx: number) => ({
        name: cluster.cluster_name || 'Кластер ' + (idx + 1),
        intent: cluster.intent || 'general',
        color: 'emerald',
        icon: cluster.intent === 'commercial' ? 'ShoppingCart' : 'FileText',
        phrases: cluster.phrases || []
      }));
      
      const transformedMinusWords = Object.keys(minusWords).flatMap(category => {
        const catData = minusWords[category];
        if (Array.isArray(catData)) {
          return catData;
        }
        if (catData.phrases) {
          return catData.phrases.map((p: any) => p.phrase);
        }
        return [];
      });
      
      console.log('✅ Transformed clusters:', transformedClusters.length);
      console.log('✅ Transformed minus words:', transformedMinusWords.length);
      
      setClusters(transformedClusters);
      setMinusWords(transformedMinusWords);
      
      await saveResultsToAPI(transformedClusters, transformedMinusWords);
      
      setStep('results');
      toast.success(`Собрано ${transformedClusters.length} кластеров из Wordstat`);
    } catch (error) {
      console.error('Error fetching from Wordstat:', error);
      toast.error('Не удалось получить данные из Wordstat');
    } finally {
      setIsWordstatLoading(false);
      setStep('source');
    }
  };

  const handleNextFromSource = () => {
    if (manualKeywords.trim()) {
      setStep('cities');
    } else {
      toast.error('Введите ключевые слова или соберите из Wordstat');
    }
  };

  const handleBack = () => {
    if (step === 'cities') setStep('source');
    else if (step === 'goal') setStep('cities');
    else if (step === 'intents') setStep('goal');
    else if (step === 'results') setStep('intents');
  };

  const exportClusters = () => {
    const text = clusters.map(c =>
      `${c.name}\n${c.phrases.map(p => `${p.phrase} - ${p.count}`).join('\n')}`
    ).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const exportMinusWords = () => {
    const blob = new Blob([minusWords.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `минус-слова_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Загрузка проекта...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      {step === 'results' ? (
        <ResultsStep
          clusters={clusters}
          minusWords={minusWords}
          onExport={exportClusters}
          onNewProject={() => navigate('/')}
          projectId={projectId ? parseInt(projectId) : undefined}
          onSaveChanges={saveResultsToAPI}
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-semibold text-slate-800 mb-2 tracking-tight">
                {projectName || 'Кластеризация ключей'}
              </h1>
              <p className="text-lg text-slate-500">
                Автоматическая кластеризация ключевых слов с помощью ИИ
              </p>
            </div>

            <StepIndicator currentStep={step} />

          {step === 'source' && (
            <SourceStep
              source={source}
              setSource={setSource}
              manualKeywords={manualKeywords}
              setManualKeywords={setManualKeywords}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              objectAddress={objectAddress}
              setObjectAddress={setObjectAddress}
              onNext={handleNextFromSource}
            />
          )}

          {step === 'cities' && (
            <CitiesStep
              selectedCities={selectedCities}
              citySearch={citySearch}
              setCitySearch={setCitySearch}
              addCity={(city) => {
                setSelectedCities([...selectedCities, city]);
                setCitySearch('');
              }}
              removeCity={(cityId) => {
                setSelectedCities(selectedCities.filter(c => c.id !== cityId));
              }}
              onNext={() => setStep('goal')}
              onBack={handleBack}
              hasManualKeywords={manualKeywords.trim().length > 0}
            />
          )}

          {step === 'goal' && (
            <GoalStep
              goal={goal}
              setGoal={setGoal}
              onNext={() => setStep('intents')}
              onBack={handleBack}
            />
          )}

          {step === 'intents' && (
            <IntentsStep
              selectedIntents={selectedIntents}
              setSelectedIntents={setSelectedIntents}
              onNext={() => setStep('processing')}
              onBack={handleBack}
            />
          )}

          {step === 'processing' && (
            <ProcessingStep
              progress={processingProgress}
              currentStage={currentStage}
            />
          )}

          <WordstatDialog
            open={step === 'wordstat-dialog'}
            onOpenChange={(open) => setStep(open ? 'wordstat-dialog' : 'source')}
            onSubmit={handleWordstatSubmit}
            isLoading={isWordstatLoading}
            selectedCities={selectedCities}
            setSelectedCities={setSelectedCities}
          />
          </div>
        </div>
      )}
    </>
  );
}