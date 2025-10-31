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

import { useAuth } from '@/contexts/AuthContext';


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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [goal, setGoal] = useState<Goal>('context');
  const [selectedIntents, setSelectedIntents] = useState<string[]>(['commercial', 'transactional']);

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusWords, setMinusWords] = useState<Phrase[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { user, sessionToken } = useAuth();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      if (!sessionToken) {
        toast.error('Ошибка: пользователь не авторизован');
        navigate('/auth');
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}?endpoint=projects&id=${projectId}`, {
          headers: {
            'X-Session-Token': sessionToken
          }
        });

        if (response.status === 403) {
          toast.error('Доступ запрещён: это не ваш проект');
          navigate('/clustering');
          return;
        }

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
            
            if (project.results.regions && Array.isArray(project.results.regions)) {
              const loadedCities = project.results.regions.map((name: string, idx: number) => ({
                id: idx + 1000,
                name,
                region: '',
                population: 0
              }));
              setSelectedCities(loadedCities);
              console.log('📍 Loaded regions from DB:', project.results.regions);
            }
            
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

  const saveResultsToAPI = useCallback(async (clustersData: Cluster[], minusWordsData: Phrase[]) => {
    console.log('🔥 saveResultsToAPI CALLED', {
      projectId,
      clustersCount: clustersData.length,
      minusWordsCount: minusWordsData.length
    });
    
    if (!projectId) {
      console.error('❌ No projectId provided');
      return;
    }

    if (!sessionToken) {
      console.error('❌ No session token found');
      toast.error('Ошибка: пользователь не авторизован');
      return;
    }

    try {
      console.log('💾 Sending results to API...');
      const response = await fetch(`${API_URL}?endpoint=projects`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          id: parseInt(projectId),
          results: {
            clusters: clustersData,
            minusWords: minusWordsData,
            regions: selectedCities.map(c => c.name)
          }
        })
      });

      if (response.status === 403) {
        toast.error('Доступ запрещён: это не ваш проект');
        return;
      }

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



  const handleWordstatSubmit = async (query: string, cities: City[], mode: string) => {
    if (!query || !query.trim()) {
      toast.error('Введите поисковый запрос');
      setIsWordstatLoading(false);
      return;
    }
    
    if (cities.length === 0) {
      toast.error('Выберите хотя бы один регион');
      setIsWordstatLoading(false);
      return;
    }
    
    try {
      const regionIds = cities.map(c => c.id);
      
      const requestBody = {
        keywords: [query.trim()],
        regions: regionIds,
        mode: mode,
        use_openai: false,
        selected_intents: selectedIntents,
        region_names: cities.map(c => c.name)
      };
      
      console.log('🚀 WORDSTAT REQUEST:', requestBody);
      
      const response = await fetch(WORDSTAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Wordstat request failed');
      }

      const data = await response.json();
      setLoadingProgress(100);
      
      const searchQuery = data.data?.SearchQuery?.[0];
      if (!searchQuery || !searchQuery.Clusters) {
        throw new Error('Invalid response format');
      }
      
      const clusters = searchQuery.Clusters;
      
      const allPhrases = clusters.flatMap((cluster: any) => cluster.phrases || []);
      
      const transformedClusters = [
        {
          name: 'Все ключи',
          intent: 'general',
          color: 'emerald',
          icon: 'FolderOpen',
          phrases: allPhrases
        }
      ];
      
      const finalMinusWords: Phrase[] = [];
      
      setClusters(transformedClusters);
      setMinusWords(finalMinusWords);
      
      await saveResultsToAPI(transformedClusters, finalMinusWords);
      
      toast.success('Кластеризация завершена!');
      setStep('results');
    } catch (error) {
      console.error('Error fetching from Wordstat:', error);
      toast.error('Не удалось получить данные из Wordstat');
      setStep('cities');
    } finally {
      setIsWordstatLoading(false);
    }
  };

  const handleNextFromSource = async () => {
    if (!manualKeywords.trim()) {
      toast.error('Введите ключевые слова или соберите из Wordstat');
      return;
    }

    const keywords = manualKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      toast.error('Введите хотя бы одно ключевое слово');
      return;
    }

    setStep('cities');
  };

  const handleBack = () => {
    if (step === 'cities') setStep('source');
    else if (step === 'goal') setStep('cities');
    else if (step === 'intents') setStep('goal');
    else if (step === 'cluster-names') setStep('processing');
    else if (step === 'results') setStep('cluster-names');
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
    const text = minusWords.map(p => `${p.phrase} - ${p.count}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
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
          regions={selectedCities.map(c => c.name)}
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-semibold text-slate-800 mb-2 tracking-tight">
                AI сбор ключей
              </h1>
              <p className="text-lg text-slate-500">
                {projectName || 'Автоматическая кластеризация ключевых слов'}
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
              onWordstatClick={() => setStep('wordstat-dialog')}
              isLoading={false}
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
              onNext={() => {
                console.log('🔵 Cities step: onNext clicked');
                setStep('goal');
                console.log('🔵 Cities step: setStep(goal) called');
              }}
              onBack={handleBack}
              hasManualKeywords={manualKeywords.trim().length > 0}
              manualKeyword={manualKeywords.split('\n')[0]?.trim() || ''}
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
              onNext={async () => {
                const firstKeyword = manualKeywords.split('\n')[0]?.trim();
                if (firstKeyword && selectedCities.length > 0) {
                  setLoadingProgress(0);
                  setIsWordstatLoading(true);
                  setStep('processing');
                  
                  const progressInterval = setInterval(() => {
                    setLoadingProgress(prev => Math.min(prev + 2, 90));
                  }, 200);
                  
                  try {
                    await handleWordstatSubmit(firstKeyword, selectedCities, goal);
                  } finally {
                    clearInterval(progressInterval);
                  }
                }
              }}
              onBack={handleBack}
            />
          )}

          {(step === 'processing' || isWordstatLoading) && (
            <ProcessingStep
              progress={loadingProgress}
              currentStage={Math.floor(loadingProgress / 20)}
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