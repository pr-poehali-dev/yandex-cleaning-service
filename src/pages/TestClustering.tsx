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
import AppSidebar from '@/components/layout/AppSidebar';

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
  { bg: 'bg-slate-50', border: 'border-slate-200', headerBg: 'bg-white', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { bg: 'bg-slate-50', border: 'border-slate-200', headerBg: 'bg-white', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  { bg: 'bg-slate-50', border: 'border-slate-200', headerBg: 'bg-white', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  { bg: 'bg-slate-50', border: 'border-slate-200', headerBg: 'bg-white', iconBg: 'bg-lime-100', iconColor: 'text-lime-600' },
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
            setTimeout(async () => {
              setClusters(mockClusters);
              setMinusWords(mockMinusWords);
              setRenderKey(prev => prev + 1);
              setStep('results');
              
              // Save results to API
              await saveResultsToAPI(mockClusters, mockMinusWords);
              
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
        toast.error('Выберите хотя бы один тип интента');
        return;
      }
      setStep('processing');
    }
  };

  const handleBack = () => {
    if (step === 'cities') setStep('source');
    else if (step === 'goal') setStep('cities');
    else if (step === 'intents') setStep('goal');
  };

  const handleExport = (type: 'csv' | 'excel') => {
    if (type === 'csv') {
      let csv = 'Кластер,Интент,Фраза,Частотность\n';
      clusters.forEach(cluster => {
        cluster.phrases.forEach(phrase => {
          csv += `"${cluster.name}","${cluster.intent}","${phrase.phrase}",${phrase.count}\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `clusters_${projectId || 'export'}.csv`;
      link.click();
      toast.success('CSV файл скачан');
    } else {
      toast.info('Excel экспорт в разработке');
    }
  };

  const copyMinusWords = () => {
    navigator.clipboard.writeText(minusWords.join(' '));
    toast.success('Минус-слова скопированы в буфер обмена');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка проекта...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/clustering')}
              >
                <Icon name="ArrowLeft" className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {projectName || 'Новый проект'}
                </h1>
                <p className="text-sm text-gray-500">Кластеризация ключевых запросов</p>
              </div>
            </div>
            {step !== 'processing' && step !== 'results' && (
              <div className="flex gap-2">
                {step !== 'source' && (
                  <Button variant="outline" onClick={handleBack}>
                    Назад
                  </Button>
                )}
                <Button onClick={handleNext}>
                  Далее
                  <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Source Step */}
          {step === 'source' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Источник данных</CardTitle>
                  <CardDescription>Выберите откуда взять ключевые запросы</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSource('manual')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        source === 'manual' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon name="FileText" className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">Вручную</div>
                      <div className="text-sm text-gray-500">Ввести список запросов</div>
                    </button>
                    
                    <button
                      onClick={() => setSource('website')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        source === 'website' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon name="Globe" className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">С сайта</div>
                      <div className="text-sm text-gray-500">Парсинг конкурентов</div>
                    </button>
                  </div>

                  {source === 'manual' && (
                    <div className="space-y-2">
                      <Label htmlFor="keywords">Ключевые запросы</Label>
                      <textarea
                        id="keywords"
                        className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Введите ключевые запросы (по одному на строку)&#10;&#10;Например:&#10;купить квартиру&#10;купить квартиру москва&#10;купить квартиру недорого"
                        value={manualKeywords}
                        onChange={(e) => setManualKeywords(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">
                        {manualKeywords.split('\n').filter(k => k.trim()).length} запросов
                      </p>
                    </div>
                  )}

                  {source === 'website' && (
                    <div className="space-y-2">
                      <Label htmlFor="website">URL сайта конкурента</Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://example.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">
                        Мы проанализируем сайт и соберём релевантные запросы
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cities Step */}
          {step === 'cities' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Регионы</CardTitle>
                  <CardDescription>Выберите регионы для анализа запросов</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="city-search">Поиск города</Label>
                    <Input
                      id="city-search"
                      type="text"
                      placeholder="Начните вводить название города..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                    />
                  </div>

                  {citySearch && filteredCities.length > 0 && (
                    <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                      {filteredCities.slice(0, 10).map(city => (
                        <button
                          key={city.id}
                          onClick={() => addCity(city)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium">{city.name}</div>
                          <div className="text-sm text-gray-500">{city.region}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Выбранные города ({selectedCities.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCities.map(city => (
                        <Badge 
                          key={city.id} 
                          variant="secondary"
                          className="pl-3 pr-1 py-1"
                        >
                          {city.name}
                          <button
                            onClick={() => removeCity(city.id)}
                            className="ml-2 hover:text-red-600"
                          >
                            <Icon name="X" className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Goal Step */}
          {step === 'goal' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Цель кластеризации</CardTitle>
                  <CardDescription>Выберите, для чего нужна кластеризация</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setGoal('context')}
                      className={`p-6 border-2 rounded-lg transition-all text-left ${
                        goal === 'context' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon name="Target" className="h-8 w-8 mb-3 text-blue-600" />
                      <div className="font-medium text-lg mb-2">Контекстная реклама</div>
                      <div className="text-sm text-gray-500">
                        Группировка для Яндекс.Директ и Google Ads. Создание релевантных групп объявлений.
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setGoal('seo')}
                      className={`p-6 border-2 rounded-lg transition-all text-left ${
                        goal === 'seo' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon name="TrendingUp" className="h-8 w-8 mb-3 text-blue-600" />
                      <div className="font-medium text-lg mb-2">SEO продвижение</div>
                      <div className="text-sm text-gray-500">
                        Структура сайта и семантическое ядро. Распределение запросов по страницам.
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Intents Step */}
          {step === 'intents' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Типы интентов</CardTitle>
                  <CardDescription>Выберите какие интенты нужно выделить</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {INTENT_TYPES.map(intent => (
                      <div
                        key={intent.id}
                        onClick={() => toggleIntent(intent.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedIntents.includes(intent.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={selectedIntents.includes(intent.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{intent.emoji}</span>
                              <span className="font-medium">{intent.label}</span>
                            </div>
                            <p className="text-sm text-gray-500">{intent.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Обработка данных</CardTitle>
                  <CardDescription>Это может занять несколько минут</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {PROCESSING_STAGES[currentStage]?.label}
                      </span>
                      <span className="font-medium">{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    {PROCESSING_STAGES.map((stage, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          idx < currentStage
                            ? 'bg-green-50 text-green-700'
                            : idx === currentStage
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {idx < currentStage ? (
                          <Icon name="CheckCircle2" className="h-5 w-5" />
                        ) : idx === currentStage ? (
                          <div className="animate-spin">
                            <Icon name="Loader2" className="h-5 w-5" />
                          </div>
                        ) : (
                          <Icon name="Circle" className="h-5 w-5" />
                        )}
                        <span className="text-sm">{stage.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && (
            <div key={renderKey} className="space-y-6 pb-8">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="relative overflow-hidden shadow-lg">
                  <div className="relative p-6 bg-white">
                    <Icon name="Layers" className="h-8 w-8 text-slate-500 mb-3" />
                    <div className="text-4xl font-bold text-slate-900 mb-2">{clusters.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Кластеров</div>
                  </div>
                </Card>
                <Card className="relative overflow-hidden shadow-lg">
                  <div className="relative p-6 bg-white">
                    <Icon name="Key" className="h-8 w-8 text-slate-500 mb-3" />
                    <div className="text-4xl font-bold text-slate-900 mb-2">
                      {clusters.reduce((sum, c) => sum + c.phrases.length, 0)}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Ключевых фраз</div>
                  </div>
                </Card>
                <Card className="relative overflow-hidden shadow-lg">
                  <div className="relative p-6 bg-white">
                    <Icon name="Ban" className="h-8 w-8 text-slate-500 mb-3" />
                    <div className="text-4xl font-bold text-slate-900 mb-2">{minusWords.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Минус-слов</div>
                  </div>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={() => handleExport('csv')}>
                  <Icon name="Download" className="mr-2 h-4 w-4" />
                  Экспорт CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('excel')}>
                  <Icon name="FileSpreadsheet" className="mr-2 h-4 w-4" />
                  Экспорт Excel
                </Button>
                <Button variant="outline" onClick={copyMinusWords}>
                  <Icon name="Copy" className="mr-2 h-4 w-4" />
                  Копировать минус-слова
                </Button>
              </div>

              {/* Clusters */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Кластеры</h2>
                {clusters.map((cluster, idx) => {
                  const style = CLUSTER_STYLES[idx % CLUSTER_STYLES.length];
                  const intentType = INTENT_TYPES.find(i => i.id === cluster.intent);
                  
                  return (
                    <Card key={idx} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center`}>
                              <Icon name={cluster.icon as any} className={`h-5 w-5 ${style.iconColor}`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{cluster.name}</CardTitle>
                              <CardDescription>
                                {intentType?.emoji} {intentType?.label} • {cluster.phrases.length} фраз
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {INTENT_TYPES.find(t => t.id === cluster.intent)?.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {cluster.phrases.map((phrase, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded"
                            >
                              <span className="text-sm">{phrase.phrase}</span>
                              <Badge variant="outline" className="font-mono text-xs">
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Минус-слова</CardTitle>
                      <CardDescription>Слова для исключения из показов</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={copyMinusWords}>
                      <Icon name="Copy" className="mr-2 h-4 w-4" />
                      Копировать
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {minusWords.map((word, idx) => (
                      <Badge key={idx} variant="destructive">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}