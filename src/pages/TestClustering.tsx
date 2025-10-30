import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import Header from '@/components/Header';
import { RUSSIAN_CITIES, City } from '@/data/russian-cities';
import SourceStep from '@/components/clustering/SourceStep';
import CitiesStep from '@/components/clustering/CitiesStep';
import GoalStep from '@/components/clustering/GoalStep';
import IntentsStep from '@/components/clustering/IntentsStep';
import ProcessingStep from '@/components/clustering/ProcessingStep';
import ResultsStep from '@/components/clustering/ResultsStep';
import StepIndicator from '@/components/clustering/StepIndicator';

const API_URL = 'https://functions.poehali.dev/06df3397-13af-46f0-946a-f5d38aa6f60f';

type Step = 'source' | 'cities' | 'goal' | 'intents' | 'processing' | 'results';
type Source = 'manual' | 'website' | 'wordstat';
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

const PROCESSING_STAGES = [
  { label: 'Анализ ключевых фраз...', duration: 1500 },
  { label: 'Определение интентов...', duration: 2000 },
  { label: 'Группировка в кластеры...', duration: 2500 },
  { label: 'Выделение минус-слов...', duration: 1500 },
  { label: 'Финализация результатов...', duration: 1000 }
];

const mockClusters: Cluster[] = [
  {
    name: 'Вторичный рынок',
    intent: 'commercial',
    color: 'blue',
    icon: 'Home',
    phrases: [
      { phrase: 'купить квартиру вторичку', count: 12000 },
      { phrase: 'купить квартиру вторичный рынок', count: 3800 },
      { phrase: 'купить квартиру от собственника', count: 11000 },
      { phrase: 'купить квартиру без посредников', count: 14000 }
    ]
  },
  {
    name: 'Новостройки от застройщика',
    intent: 'commercial',
    color: 'emerald',
    icon: 'Building2',
    phrases: [
      { phrase: 'купить квартиру от застройщика', count: 8500 },
      { phrase: 'купить квартиру новостройка', count: 15000 },
      { phrase: 'купить квартиру у застройщика', count: 11000 },
      { phrase: 'купить квартиру на первичном рынке', count: 6800 }
    ]
  },
  {
    name: 'Агрегаторы и площадки',
    intent: 'navigational',
    color: 'purple',
    icon: 'Globe',
    phrases: [
      { phrase: 'купить квартиру авито', count: 19000 },
      { phrase: 'купить квартиру циан', count: 16500 },
      { phrase: 'купить квартиру домклик', count: 8200 }
    ]
  }
];

const mockMinusWords = ['бесплатно', 'даром', 'игра', 'в игре', 'скачать', 'торрент', 'порно', 'xxx', 'вакансия', 'работа'];

function generateClustersFromKeywords(keywords: string[], intents: string[]): Cluster[] {
  if (keywords.length === 0) return mockClusters;
  
  const clusters: Cluster[] = [];
  const clusterColors = ['blue', 'emerald', 'purple', 'orange'];
  const clusterIcons = ['Home', 'Building2', 'Globe', 'ShoppingCart'];
  
  const groupedKeywords = new Map<string, string[]>();
  
  keywords.forEach(kw => {
    const words = kw.toLowerCase().split(' ');
    const mainWord = words[words.length - 1] || words[0];
    
    if (!groupedKeywords.has(mainWord)) {
      groupedKeywords.set(mainWord, []);
    }
    groupedKeywords.get(mainWord)!.push(kw);
  });
  
  let colorIdx = 0;
  groupedKeywords.forEach((phrases, mainWord) => {
    if (phrases.length > 0) {
      clusters.push({
        name: `Кластер: ${mainWord}`,
        intent: intents[0] || 'commercial',
        color: clusterColors[colorIdx % clusterColors.length],
        icon: clusterIcons[colorIdx % clusterIcons.length],
        phrases: phrases.map(p => ({
          phrase: p,
          count: Math.floor(Math.random() * 15000) + 1000
        }))
      });
      colorIdx++;
    }
  });
  
  return clusters.length > 0 ? clusters : mockClusters;
}

function generateMinusWords(keywords: string[]): string[] {
  const commonMinusWords = ['бесплатно', 'даром', 'скачать', 'торрент', 'игра', 'вакансия', 'работа'];
  const keywordWords = keywords.flatMap(kw => kw.toLowerCase().split(' '));
  
  const excludeWords = new Set(['купить', 'заказать', 'цена', 'москва', 'спб']);
  const minusWords = keywordWords.filter(w => 
    w.length > 3 && 
    !excludeWords.has(w) &&
    Math.random() > 0.7
  );
  
  return [...new Set([...commonMinusWords, ...minusWords])].slice(0, 15);
}

export default function TestClustering() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('manual');
  const [manualKeywords, setManualKeywords] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [wordstatQuery, setWordstatQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState<City[]>([RUSSIAN_CITIES[0]]);
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
      const totalPhrases = clustersData.reduce((sum, c) => sum + c.phrases.length, 0);
      const payload = {
        id: parseInt(projectId),
        results: {
          clusters: clustersData,
          minusWords: minusWordsData
        },
        keywordsCount: totalPhrases,
        clustersCount: clustersData.length,
        minusWordsCount: minusWordsData.length
      };
      
      console.log('📤 Sending PUT request:', API_URL, payload);
      
      const response = await fetch(`${API_URL}?endpoint=projects`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Save failed:', errorText);
        throw new Error('Failed to save results');
      }

      const result = await response.json();
      console.log('✅ SAVED TO DATABASE!', result);
      toast.success('Результаты сохранены в базу данных!');
    } catch (error) {
      console.error('❌ Error saving:', error);
      toast.error('Не удалось сохранить результаты');
    }
  }, [projectId]);

  const addCity = (city: City) => {
    setSelectedCities([...selectedCities, city]);
    setCitySearch('');
  };

  const removeCity = (cityId: number) => {
    setSelectedCities(selectedCities.filter(c => c.id !== cityId));
  };

  const toggleIntent = (intentId: string) => {
    setSelectedIntents(prev => 
      prev.includes(intentId) 
        ? prev.filter(id => id !== intentId)
        : [...prev, intentId]
    );
  };

  useEffect(() => {
    if (step === 'processing') {
      console.log('🚀 PROCESSING STARTED', { projectId });
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
              console.log('✨ PROCESSING COMPLETE, CALLING SAVE...');
              
              const keywords = source === 'manual' 
                ? manualKeywords.split('\n').filter(k => k.trim())
                : source === 'wordstat'
                ? [wordstatQuery]
                : [];
              
              const generatedClusters = generateClustersFromKeywords(keywords, selectedIntents);
              const generatedMinusWords = generateMinusWords(keywords);
              
              setClusters(generatedClusters);
              setMinusWords(generatedMinusWords);
              console.log('💾 About to call saveResultsToAPI...');
              await saveResultsToAPI(generatedClusters, generatedMinusWords);
              console.log('✅ Save completed, showing results');
              setStep('results');
              toast.success('Кластеризация завершена!');
            }, stage.duration);
          }
        }, totalDuration);
        totalDuration += stage.duration;
      });
    }
  }, [step, projectId, saveResultsToAPI]);

  const exportResults = () => {
    const data = {
      clusters,
      minusWords,
      meta: {
        totalClusters: clusters.length,
        totalPhrases: clusters.reduce((sum, c) => sum + c.phrases.length, 0),
        totalMinusWords: minusWords.length
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clustering-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Результаты экспортированы');
  };

  const createNewProject = () => {
    navigate('/clustering');
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-slate-500 mt-4">Загрузка проекта...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-semibold text-slate-800 mb-3 tracking-tight">
              AI сбор ключевых фраз
            </h1>
            <p className="text-lg text-slate-500">
              Автоматическая кластеризация ключевых слов с помощью ИИ
            </p>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/clustering')}
              className="mt-4 text-slate-600 hover:text-slate-800"
            >
              <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
              К проектам
            </Button>
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
              wordstatQuery={wordstatQuery}
              setWordstatQuery={setWordstatQuery}
              onNext={() => setStep('cities')}
            />
          )}

          {step === 'cities' && (
            <CitiesStep
              selectedCities={selectedCities}
              citySearch={citySearch}
              setCitySearch={setCitySearch}
              addCity={addCity}
              removeCity={removeCity}
              onNext={() => setStep('goal')}
              onBack={() => setStep('source')}
            />
          )}

          {step === 'goal' && (
            <GoalStep
              goal={goal}
              setGoal={setGoal}
              onNext={() => setStep('intents')}
              onBack={() => setStep('cities')}
            />
          )}

          {step === 'intents' && (
            <IntentsStep
              selectedIntents={selectedIntents}
              toggleIntent={toggleIntent}
              onNext={() => setStep('processing')}
              onBack={() => setStep('goal')}
            />
          )}

          {step === 'processing' && (
            <ProcessingStep
              progress={processingProgress}
              currentStage={currentStage}
            />
          )}

          {step === 'results' && (
            <ResultsStep
              clusters={clusters}
              minusWords={minusWords}
              onExport={exportResults}
              onNewProject={createNewProject}
            />
          )}
        </div>
      </div>
    </>
  );
}