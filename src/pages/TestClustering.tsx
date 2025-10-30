import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { RUSSIAN_CITIES, City } from '@/data/russian-cities';
import AppSidebar from '@/components/layout/AppSidebar';

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
  { bg: 'bg-slate-100', border: 'border-slate-200', headerBg: 'bg-white' },
  { bg: 'bg-slate-100', border: 'border-slate-200', headerBg: 'bg-white' },
  { bg: 'bg-slate-100', border: 'border-slate-200', headerBg: 'bg-white' },
  { bg: 'bg-slate-100', border: 'border-slate-200', headerBg: 'bg-white' },
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
  const { toast } = useToast();

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
              toast({ 
                title: '✅ Готово!', 
                description: 'Кластеры созданы, минус-слова выделены' 
              });
            }, stage.duration);
          }
        }, totalDuration);
        totalDuration += stage.duration;
      });
    }
  }, [step, toast]);

  const handleNext = () => {
    if (step === 'source') {
      if (source === 'manual' && !manualKeywords.trim()) {
        toast({ title: 'Введите ключевые слова', variant: 'destructive' });
        return;
      }
      if (source === 'website' && !websiteUrl.trim()) {
        toast({ title: 'Введите URL сайта', variant: 'destructive' });
        return;
      }
      setStep('cities');
    } else if (step === 'cities') {
      if (selectedCities.length === 0) {
        toast({ title: 'Выберите хотя бы один город', variant: 'destructive' });
        return;
      }
      setStep('goal');
    } else if (step === 'goal') {
      setStep('intents');
    } else if (step === 'intents') {
      if (selectedIntents.length === 0) {
        toast({ title: 'Выберите хотя бы один тип запросов', variant: 'destructive' });
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

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8 ml-64">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-semibold text-slate-800 mb-3 tracking-tight">
            AI сбор ключей
          </h1>
          <p className="text-lg text-slate-500">
            Автоматическая кластеризация и минус-слова за 30 секунд
          </p>
        </div>

        {step !== 'processing' && step !== 'results' && (
          <div className="flex justify-center gap-4 mb-12">
            {[
              { key: 'source', num: 1, label: 'Источник' },
              { key: 'cities', num: 2, label: 'География' },
              { key: 'goal', num: 3, label: 'Цель' },
              { key: 'intents', num: 4, label: 'Интенты' }
            ].map(({ key, num, label }) => {
              const stepKeys = ['source', 'cities', 'goal', 'intents'];
              const currentIdx = stepKeys.indexOf(step);
              const itemIdx = stepKeys.indexOf(key);
              const isActive = itemIdx === currentIdx;
              const isComplete = itemIdx < currentIdx;
              
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                    ${isComplete ? 'bg-emerald-500 text-white' : 
                      isActive ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' : 
                      'bg-slate-200 text-slate-500'}
                  `}>
                    {isComplete ? '✓' : num}
                  </div>
                  {itemIdx < 3 && (
                    <div className={`w-12 md:w-20 h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 'source' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Источник ключевых слов</CardTitle>
              <CardDescription>Откуда берём ключевые слова для анализа?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSource('manual')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    source === 'manual'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="Type" size={32} className={source === 'manual' ? 'text-emerald-600' : 'text-slate-400'} />
                  <h3 className="font-semibold mt-3 text-lg">Вручную</h3>
                  <p className="text-sm text-slate-500 mt-1">Вставить список ключей</p>
                </button>

                <button
                  onClick={() => setSource('website')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    source === 'website'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="Globe" size={32} className={source === 'website' ? 'text-emerald-600' : 'text-slate-400'} />
                  <h3 className="font-semibold mt-3 text-lg">С сайта</h3>
                  <p className="text-sm text-slate-500 mt-1">Парсинг из мета-тегов</p>
                </button>
              </div>

              {source === 'manual' && (
                <div className="space-y-2">
                  <Label>Ключевые слова (каждое с новой строки)</Label>
                  <textarea
                    className="w-full h-32 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder="купить квартиру&#10;купить дом&#10;снять квартиру"
                    value={manualKeywords}
                    onChange={(e) => setManualKeywords(e.target.value)}
                  />
                </div>
              )}

              {source === 'website' && (
                <div className="space-y-2">
                  <Label>URL сайта</Label>
                  <Input
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
              )}

              <Button 
                onClick={handleNext}
                className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Далее <Icon name="ArrowRight" size={20} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'cities' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">География</CardTitle>
              <CardDescription>Для каких регионов собираем ключи?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Выбранные города ({selectedCities.length})</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/50 rounded-lg min-h-[60px]">
                  {selectedCities.map(city => (
                    <Badge 
                      key={city.id}
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 px-3 py-1 text-sm"
                    >
                      {city.name}
                      <button
                        onClick={() => removeCity(city.id)}
                        className="ml-2 hover:text-emerald-950"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Добавить город</Label>
                <Input
                  placeholder="Начните вводить название города..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                />
                {citySearch && filteredCities.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg">
                    {filteredCities.slice(0, 10).map(city => (
                      <button
                        key={city.id}
                        onClick={() => addCity(city)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium">{city.name}</span>
                        <span className="text-sm text-slate-500 ml-2">({city.region})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 py-6 text-lg"
                >
                  <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                </Button>
                <Button 
                  onClick={handleNext}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
                >
                  Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'goal' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Цель сбора</CardTitle>
              <CardDescription>Для чего собираем семантику?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGoal('context')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    goal === 'context'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="Target" size={32} className={goal === 'context' ? 'text-emerald-600' : 'text-slate-400'} />
                  <h3 className="font-semibold mt-3 text-lg">Контекст</h3>
                  <p className="text-sm text-slate-500 mt-1">Яндекс.Директ, Google Ads</p>
                </button>

                <button
                  onClick={() => setGoal('seo')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    goal === 'seo'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon name="TrendingUp" size={32} className={goal === 'seo' ? 'text-emerald-600' : 'text-slate-400'} />
                  <h3 className="font-semibold mt-3 text-lg">SEO</h3>
                  <p className="text-sm text-slate-500 mt-1">Продвижение в поиске</p>
                </button>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 py-6 text-lg"
                >
                  <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                </Button>
                <Button 
                  onClick={handleNext}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
                >
                  Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'intents' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Типы запросов</CardTitle>
              <CardDescription>Какие интенты включить в анализ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {INTENT_TYPES.map(intent => (
                  <label
                    key={intent.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedIntents.includes(intent.id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedIntents.includes(intent.id)}
                      onCheckedChange={() => toggleIntent(intent.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{intent.emoji}</span>
                        <h3 className="font-semibold text-lg">{intent.label}</h3>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{intent.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 py-6 text-lg"
                >
                  <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                </Button>
                <Button 
                  onClick={handleNext}
                  className="flex-1 py-6 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Начать анализ <Icon name="Sparkles" size={20} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'processing' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Обработка запроса...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 py-8">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                  <Icon name="Sparkles" size={48} className="text-emerald-600" />
                </div>
              </div>

              <div className="space-y-4">
                <Progress value={processingProgress} className="h-3" />
                <p className="text-center text-lg font-medium text-slate-700">
                  {PROCESSING_STAGES[currentStage]?.label}
                </p>
                <p className="text-center text-sm text-slate-500">
                  {Math.round(processingProgress)}% завершено
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'results' && (
          <div key={renderKey} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Результаты</h2>
                <p className="text-slate-500 mt-1">
                  {clusters.length} кластеров • {totalPhrases} фраз • {minusWords.length} минус-слов
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={exportClusters} variant="outline">
                  <Icon name="Download" size={18} className="mr-2" /> Кластеры
                </Button>
                <Button onClick={exportMinusWords} variant="outline">
                  <Icon name="Download" size={18} className="mr-2" /> Минус-слова
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {clusters.map((cluster, idx) => {
                return (
                  <Card key={cluster.name} className="border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{cluster.name}</CardTitle>
                          <CardDescription>{cluster.phrases.length} фраз</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {INTENT_TYPES.find(t => t.id === cluster.intent)?.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        {cluster.phrases.map(phrase => (
                          <div key={phrase.phrase} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 rounded">
                            <span className="text-sm">{phrase.phrase}</span>
                            <Badge variant="outline">{phrase.count.toLocaleString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Card className="border">
                <CardHeader>
                  <div>
                    <CardTitle className="text-lg">Минус-слова</CardTitle>
                    <CardDescription>{minusWords.length} слов для исключения</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {minusWords.map(word => (
                      <Badge key={word} variant="secondary">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={handleBack}
              variant="outline"
              className="w-full py-6 text-lg"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад к настройкам
            </Button>
          </div>
        )}
      </div>
      </div>
    </>
  );
}