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

export default function Index() {
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-white p-4 md:p-8 ml-64">
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
          <div className="mb-12 flex justify-center items-center gap-0">
            {['source', 'cities', 'goal', 'intents'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === s ? 'bg-emerald-500 text-white' : 
                  ['source', 'cities', 'goal', 'intents'].indexOf(step) > idx ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {['source', 'cities', 'goal', 'intents'].indexOf(step) > idx ? '✓' : idx + 1}
                </div>
                {idx < 3 && <div className={`w-20 h-px ${
                  ['source', 'cities', 'goal', 'intents'].indexOf(step) > idx ? 'bg-emerald-500' : 'bg-slate-200'
                }`} />}
              </div>
            ))}
          </div>
        )}

        <Card className="shadow-sm bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {step === 'source' && (
            <>
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-semibold text-slate-800 mb-2">
                  Откуда взять ключи?
                </CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Выберите источник для сбора семантического ядра
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      source === 'manual' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                    onClick={() => setSource('manual')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                      <Icon name="Edit" size={20} className="text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Вставить вручную</h3>
                    <p className="text-sm text-slate-500">Есть список из Wordstat</p>
                  </button>

                  <button 
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      source === 'website' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                    onClick={() => setSource('website')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                      <Icon name="Globe" size={20} className="text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Указать сайт</h3>
                    <p className="text-sm text-slate-500">AI найдёт базисы сам</p>
                  </button>
                </div>

                {source === 'manual' && (
                  <div className="space-y-3 mt-6">
                    <Label className="text-sm font-medium text-slate-700">Ключевые слова (каждое с новой строки)</Label>
                    <textarea
                      className="w-full min-h-[240px] p-4 border border-slate-200 rounded-lg resize-y font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="купить квартиру&#10;купить квартиру в москве&#10;купить квартиру от застройщика&#10;купить квартиру вторичку"
                      value={manualKeywords}
                      onChange={(e) => setManualKeywords(e.target.value)}
                    />
                    <p className="text-sm text-slate-500">
                      Введите базовые запросы — AI кластеризует автоматически
                    </p>
                  </div>
                )}

                {source === 'website' && (
                  <div className="space-y-3 mt-6">
                    <Label className="text-sm font-medium text-slate-700">URL сайта</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="h-12 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-sm text-slate-500">
                      AI проанализирует сайт и соберёт ключи автоматически
                    </p>
                  </div>
                )}

                <Button onClick={handleNext} className="w-full h-12 text-base font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors mt-6">
                  Далее
                </Button>
              </CardContent>
            </>
          )}

          {step === 'cities' && (
            <>
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-semibold text-slate-800 mb-2">
                  География
                </CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Для каких регионов собираем ключи?
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Выбранные города ({selectedCities.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-3 min-h-[60px] p-4 border border-slate-200 rounded-lg bg-white">
                    {selectedCities.map(city => (
                      <Badge key={city.id} className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm font-medium">
                        {city.name}
                        <Icon 
                          name="X" 
                          size={14} 
                          className="ml-2 cursor-pointer hover:text-emerald-900" 
                          onClick={(e) => { e.stopPropagation(); removeCity(city.id); }}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <Label className="text-sm font-medium text-slate-700">Добавить город</Label>
                  <Input
                    placeholder="Начните вводить название города..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="h-12 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  {citySearch && filteredCities.length > 0 && (
                    <div className="border border-slate-200 rounded-lg max-h-[240px] overflow-y-auto bg-white">
                      {filteredCities.slice(0, 10).map(city => (
                        <div
                          key={city.id}
                          className="p-4 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => addCity(city)}
                        >
                          <span className="font-medium">{city.name}</span>
                          {city.population && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({(city.population / 1000000).toFixed(1)} млн чел.)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button onClick={handleBack} variant="outline" className="w-full h-12 border border-slate-200 hover:bg-slate-50">
                    Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white">
                    Далее
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'goal' && (
            <>
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-semibold text-slate-800 mb-2">
                  Цель использования
                </CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Для чего собираем ключи?
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      goal === 'context' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                    onClick={() => setGoal('context')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                      <Icon name="MousePointerClick" size={20} className="text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Яндекс.Директ</h3>
                    <p className="text-sm text-slate-500">Контекстная реклама</p>
                  </button>

                  <button 
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      goal === 'seo' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                    onClick={() => setGoal('seo')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                      <Icon name="TrendingUp" size={20} className="text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">SEO-продвижение</h3>
                    <p className="text-sm text-slate-500">Органический трафик</p>
                  </button>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button onClick={handleBack} variant="outline" className="w-full h-12 border border-slate-200 hover:bg-slate-50">
                    Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white">
                    Далее
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'intents' && (
            <>
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-semibold text-slate-800 mb-2">
                  Типы запросов
                </CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Какие интенты нужны?
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-3">
                  {INTENT_TYPES.map(intent => (
                    <label 
                      key={intent.id}
                      className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedIntents.includes(intent.id) ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <Checkbox 
                        checked={selectedIntents.includes(intent.id)}
                        onCheckedChange={() => toggleIntent(intent.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-800 mb-1">{intent.label}</h3>
                        <p className="text-sm text-slate-500">{intent.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button onClick={handleBack} variant="outline" className="w-full h-12 border border-slate-200 hover:bg-slate-50">
                    Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white">
                    Создать кластеры
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'processing' && (
            <CardContent className="p-12">
              <div className="text-center space-y-8">
                <div className="p-6 bg-emerald-100 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                  <Icon name="Loader2" size={48} className="text-emerald-600 animate-spin" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold mb-3 text-slate-800">
                    {PROCESSING_STAGES[currentStage]?.label || 'Обработка...'}
                  </h2>
                  <p className="text-slate-500">
                    Анализируем ваши ключи
                  </p>
                </div>

                <div className="space-y-3">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-lg font-medium text-emerald-600">{Math.round(processingProgress)}%</p>
                </div>

                <div className="flex justify-center gap-2">
                  {PROCESSING_STAGES.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-12 rounded-full transition-all ${
                        idx <= currentStage ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          )}

          {step === 'results' && (
            <>
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-semibold text-slate-800 mb-2">
                  Готово!
                </CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Кластеры и минус-слова созданы
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8" key={`results-${renderKey}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="relative overflow-hidden p-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
                    <div className="relative z-10">
                      <div className="text-4xl font-bold text-white mb-2">{clusters.length}</div>
                      <div className="text-sm text-white/90 font-medium">Кластеров</div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  </div>
                  <div className="relative overflow-hidden p-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                    <div className="relative z-10">
                      <div className="text-4xl font-bold text-white mb-2">{totalPhrases}</div>
                      <div className="text-sm text-white/90 font-medium">Фраз</div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  </div>
                  <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-2xl shadow-lg">
                    <div className="relative z-10">
                      <div className="text-4xl font-bold text-white mb-2">{minusWords.length}</div>
                      <div className="text-sm text-white/90 font-medium">Минус-слов</div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Кластеры</h3>
                    <Button onClick={exportClusters} size="sm" variant="outline" className="border-slate-200 hover:bg-slate-50">
                      <Icon name="Download" size={16} className="mr-2" />
                      Экспорт
                    </Button>
                  </div>
                  
                  {clusters.map((cluster, idx) => {
                    const style = CLUSTER_STYLES[idx % CLUSTER_STYLES.length];
                    return (
                      <div key={idx} className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                        <div className={`p-6 ${style.bg} relative overflow-hidden`}>
                          <div className="relative z-10">
                            <h4 className="font-bold text-xl text-white mb-1">{cluster.name}</h4>
                            <div className="text-sm text-white/80">{cluster.phrases.length} фраз</div>
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                        </div>
                        <div className="p-5 space-y-2 bg-white">
                          {cluster.phrases.map((phrase, pidx) => (
                            <div key={pidx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group border border-transparent hover:border-slate-200">
                              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{phrase.phrase}</span>
                              <span className="text-sm text-slate-500 font-semibold ml-3 px-2 py-1 bg-white rounded-lg group-hover:bg-slate-200 transition-colors">
                                {phrase.count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl overflow-hidden shadow-lg">
                  <div className="p-6 bg-gradient-to-br from-rose-500 to-pink-500 relative overflow-hidden flex items-center justify-between">
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-white mb-1">Минус-слова</h3>
                      <div className="text-sm text-white/80">{minusWords.length} слов</div>
                    </div>
                    <Button onClick={exportMinusWords} size="sm" className="relative z-10 bg-white/20 hover:bg-white/30 text-white border-0">
                      <Icon name="Download" size={16} className="mr-2" />
                      Экспорт
                    </Button>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {minusWords.map((word, idx) => (
                        <span key={idx} className="px-4 py-2 bg-rose-50 text-rose-700 text-sm font-medium rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
                          −{word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Button onClick={() => setStep('source')} variant="outline" className="w-full h-12 border border-slate-200 hover:bg-slate-50 mt-6">
                  Начать заново
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
    </>
  );
}