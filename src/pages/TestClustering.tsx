import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { RUSSIAN_CITIES, City } from '@/data/russian-cities';

const API_URL = 'https://functions.poehali.dev/06df3397-13af-46f0-946a-f5d38aa6f60f';

type Step = 'source' | 'cities' | 'goal' | 'intents' | 'processing' | 'results';
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

const INTENT_TYPES = [
  { id: 'commercial', label: 'Коммерческие', description: 'купить, заказать, цена, стоимость', emoji: '💰' },
  { id: 'informational', label: 'Информационные', description: 'как, что такое, инструкция, пошагово', emoji: '📚' },
  { id: 'navigational', label: 'Навигационные', description: 'циан, авито, домклик, сайт компании', emoji: '🧭' },
  { id: 'transactional', label: 'Транзакционные', description: 'скачать, регистрация, заявка, консультация', emoji: '📝' }
];

const PROCESSING_STAGES = [
  { label: 'Анализ ключевых фраз...', duration: 1500 },
  { label: 'Определение интентов...', duration: 2000 },
  { label: 'Группировка в кластеры...', duration: 2500 },
  { label: 'Выделение минус-слов...', duration: 1500 },
  { label: 'Финализация результатов...', duration: 1000 }
];

const CLUSTER_STYLES = [
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-500', border: 'border-blue-200', headerBg: 'bg-blue-50' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-500', border: 'border-emerald-200', headerBg: 'bg-emerald-50' },
  { bg: 'bg-gradient-to-br from-purple-500 to-fuchsia-500', border: 'border-purple-200', headerBg: 'bg-purple-50' },
  { bg: 'bg-gradient-to-br from-orange-500 to-amber-500', border: 'border-orange-200', headerBg: 'bg-orange-50' },
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

export default function TestClustering() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('manual');
  const [manualKeywords, setManualKeywords] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedCities, setSelectedCities] = useState<City[]>([RUSSIAN_CITIES[0]]);
  const [citySearch, setCitySearch] = useState('');
  const [goal, setGoal] = useState<Goal>('context');
  const [selectedIntents, setSelectedIntents] = useState<string[]>(['commercial', 'transactional']);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusWords, setMinusWords] = useState<string[]>([]);
  const [renderKey, setRenderKey] = useState(0);
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
        
        if (project) {
          setProjectName(project.name || '');
          
          // Check if results exist
          if (project.results && project.results.clusters && project.results.clusters.length > 0) {
            setClusters(project.results.clusters);
            setMinusWords(project.results.minusWords || []);
            setStep('results');
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

  const saveResultsToAPI = async (clustersData: Cluster[], minusWordsData: string[]) => {
    if (!projectId) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error('Ошибка: пользователь не авторизован');
      return;
    }

    try {
      const totalPhrases = clustersData.reduce((sum, c) => sum + c.phrases.length, 0);
      
      const response = await fetch(`${API_URL}?endpoint=projects`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          id: projectId,
          results: {
            clusters: clustersData,
            minusWords: minusWordsData
          },
          keywordsCount: totalPhrases,
          clustersCount: clustersData.length,
          minusWordsCount: minusWordsData.length
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save results');
      }

      const result = await response.json();
      console.log('Results saved successfully:', result);
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Не удалось сохранить результаты');
    }
  };

  const filteredCities = RUSSIAN_CITIES.filter(city => 
    city.name.toLowerCase().includes(citySearch.toLowerCase()) &&
    !selectedCities.find(c => c.id === city.id)
  );

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
      let totalDuration = 0;
      let currentProgress = 0;

      PROCESSING_STAGES.forEach((stage, idx) => {
        setTimeout(() => {
          setCurrentStage(idx);
          const increment = 100 / PROCESSING_STAGES.length;
          currentProgress += increment;
          setProcessingProgress(Math.min(currentProgress, 100));

          if (idx === PROCESSING_STAGES.length - 1) {
            setTimeout(() => {
              setClusters(mockClusters);
              setMinusWords(mockMinusWords);
              setRenderKey(prev => prev + 1);
              setStep('results');
              
              // Save results to API
              saveResultsToAPI(mockClusters, mockMinusWords);
              
              toast.success('Готово! Кластеры созданы, минус-слова выделены');
            }, stage.duration);
          }
        }, totalDuration);
        totalDuration += stage.duration;
      });
    }
  }, [step]);

  const handleNext = () => {
    if (step === 'source') {
      if (source === 'manual' && !manualKeywords.trim()) {
        toast.error('Введите ключевые слова');
        return;
      }
      if (source === 'website' && !websiteUrl.trim()) {
        toast.error('Введите URL сайта');
        return;
      }
      setStep('cities');
    } else if (step === 'cities') {
      if (selectedCities.length === 0) {
        toast.error('Выберите хотя бы один город');
        return;
      }
      setStep('goal');
    } else if (step === 'goal') {
      setStep('intents');
    } else if (step === 'intents') {
      if (selectedIntents.length === 0) {
        toast.error('Выберите хотя бы один тип запросов');
        return;
      }
      setProcessingProgress(0);
      setCurrentStage(0);
      setStep('processing');
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

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);

  const stepToNumber = (s: Step): number => {
    const map: Record<Step, number> = {
      source: 1,
      cities: 2,
      goal: 3,
      intents: 4,
      processing: 5,
      results: 5
    };
    return map[s];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-slate-500 mt-4">Загрузка проекта...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-semibold text-slate-800 mb-3 tracking-tight">
            {projectName || 'AI сбор ключей'}
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

        {step !== 'processing' && step !== 'results' && (
          <div className="mb-12 flex justify-center items-center gap-2">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  stepToNumber(step) >= num 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}>
                  {num}
                </div>
                {num < 4 && <div className={`w-12 h-0.5 ${stepToNumber(step) > num ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Source Selection */}
        {step === 'source' && (
          <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-2xl text-slate-800">Выберите источник данных</CardTitle>
              <CardDescription className="text-slate-500">Как вы хотите загрузить ключевые слова для кластеризации?</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setSource('manual')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    source === 'manual'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="FileText" className={`h-6 w-6 mb-3 ${source === 'manual' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="font-medium text-slate-800 mb-1">Вручную</div>
                  <div className="text-sm text-slate-500">Введите или вставьте список ключевых слов</div>
                </button>
                <button
                  onClick={() => setSource('website')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    source === 'website'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="Globe" className={`h-6 w-6 mb-3 ${source === 'website' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="font-medium text-slate-800 mb-1">Из сайта</div>
                  <div className="text-sm text-slate-500">Загрузить с URL или XML-карты сайта</div>
                </button>
              </div>

              {source === 'manual' && (
                <div className="space-y-4">
                  <Label htmlFor="keywords" className="text-slate-700">Ключевые слова (по одному на строке)</Label>
                  <textarea
                    id="keywords"
                    value={manualKeywords}
                    onChange={(e) => setManualKeywords(e.target.value)}
                    className="w-full min-h-[200px] p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder="купить квартиру&#10;купить квартиру москва&#10;купить квартиру новостройка&#10;..."
                  />
                </div>
              )}

              {source === 'website' && (
                <div className="space-y-4">
                  <Label htmlFor="url" className="text-slate-700">URL сайта или XML-карты</Label>
                  <Input
                    id="url"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com или https://example.com/sitemap.xml"
                    className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-sm text-slate-500">
                    ИИ автоматически проанализирует содержание страниц и выделит ключевые темы
                  </p>
                </div>
              )}

              <div className="flex justify-end mt-8">
                <Button 
                  onClick={handleNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                >
                  Далее
                  <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cities Selection */}
        {step === 'cities' && (
          <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-2xl text-slate-800">Выберите города</CardTitle>
              <CardDescription className="text-slate-500">Для каких городов нужна кластеризация?</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                <Label htmlFor="city-search" className="text-slate-700">Поиск городов</Label>
                <Input
                  id="city-search"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Начните вводить название города..."
                  className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {citySearch && filteredCities.length > 0 && (
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {filteredCities.slice(0, 10).map((city) => (
                      <button
                        key={city.id}
                        onClick={() => addCity(city)}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Label className="text-slate-700 mb-3 block">Выбранные города</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCities.map((city) => (
                    <Badge 
                      key={city.id} 
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 px-3 py-1"
                    >
                      {city.name}
                      <button
                        onClick={() => removeCity(city.id)}
                        className="ml-2 hover:text-emerald-900"
                      >
                        <Icon name="X" className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
                  Назад
                </Button>
                <Button 
                  onClick={handleNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                >
                  Далее
                  <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goal Selection */}
        {step === 'goal' && (
          <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-2xl text-slate-800">Цель кластеризации</CardTitle>
              <CardDescription className="text-slate-500">Как вы планируете использовать результаты?</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGoal('context')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    goal === 'context'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="Layout" className={`h-6 w-6 mb-3 ${goal === 'context' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="font-medium text-slate-800 mb-1">Контекстная реклама</div>
                  <div className="text-sm text-slate-500">Группировка для Яндекс.Директ и Google Ads</div>
                </button>
                <button
                  onClick={() => setGoal('seo')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    goal === 'seo'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="Search" className={`h-6 w-6 mb-3 ${goal === 'seo' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="font-medium text-slate-800 mb-1">SEO продвижение</div>
                  <div className="text-sm text-slate-500">Семантическое ядро для структуры сайта</div>
                </button>
              </div>

              <div className="flex justify-between mt-8">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
                  Назад
                </Button>
                <Button 
                  onClick={handleNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                >
                  Далее
                  <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Intent Selection */}
        {step === 'intents' && (
          <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-2xl text-slate-800">Типы запросов</CardTitle>
              <CardDescription className="text-slate-500">Выберите типы запросов для анализа</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                {INTENT_TYPES.map((intent) => (
                  <label
                    key={intent.id}
                    className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedIntents.includes(intent.id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedIntents.includes(intent.id)}
                      onCheckedChange={() => toggleIntent(intent.id)}
                      className="mt-0.5"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{intent.emoji}</span>
                        <span className="font-medium text-slate-800">{intent.label}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{intent.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
                  Назад
                </Button>
                <Button 
                  onClick={handleNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                >
                  Начать анализ
                  <Icon name="Sparkles" className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <CardContent className="p-12">
              <div className="text-center space-y-8">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <Icon name="Sparkles" className="h-10 w-10 text-emerald-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-800 mb-2">
                    {PROCESSING_STAGES[currentStage]?.label || 'Обработка...'}
                  </h3>
                  <p className="text-slate-500">ИИ анализирует ваши данные</p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-sm text-slate-500 mt-2">{Math.round(processingProgress)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {step === 'results' && (
          <div className="space-y-6" key={renderKey}>
            <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-slate-800">Результаты кластеризации</CardTitle>
                    <CardDescription className="text-slate-500">
                      {clusters.length} кластеров • {totalPhrases} фраз • {minusWords.length} минус-слов
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleBack}
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Icon name="Settings" className="mr-2 h-4 w-4" />
                    Изменить
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Clusters */}
            <div className="space-y-4">
              {clusters.map((cluster, idx) => {
                const style = CLUSTER_STYLES[idx % CLUSTER_STYLES.length];
                const intentType = INTENT_TYPES.find(i => i.id === cluster.intent);
                
                return (
                  <Card key={idx} className={`shadow-sm bg-white border ${style.border} rounded-2xl overflow-hidden`}>
                    <CardHeader className={`p-6 ${style.headerBg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`${style.bg} p-3 rounded-xl`}>
                            <Icon name={cluster.icon as any} className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-slate-800">{cluster.name}</CardTitle>
                            {intentType && (
                              <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                <span>{intentType.emoji}</span>
                                <span>{intentType.label}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-700">
                          {cluster.phrases.length} фраз
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        {cluster.phrases.map((phrase, pidx) => (
                          <div key={pidx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="text-slate-700">{phrase.phrase}</span>
                            <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-600">
                              {phrase.count.toLocaleString()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Minus Words */}
            <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl text-slate-800">Минус-слова</CardTitle>
                <CardDescription className="text-slate-500">
                  Слова для исключения нерелевантных запросов
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex flex-wrap gap-2">
                  {minusWords.map((word, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary"
                      className="bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      -{word}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={exportClusters}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Icon name="Download" className="mr-2 h-4 w-4" />
                Экспорт кластеров
              </Button>
              <Button 
                onClick={exportMinusWords}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Icon name="Download" className="mr-2 h-4 w-4" />
                Экспорт минус-слов
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}