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

const mockClusters: Cluster[] = [
  {
    name: 'Вторичный рынок',
    intent: 'commercial',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
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
    color: 'bg-green-100 text-green-800 border-green-300',
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
    color: 'bg-purple-100 text-purple-800 border-purple-300',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Кластеризатор
          </h1>
          <p className="text-lg text-muted-foreground">
            OpenAI создаст кластеры и минус-слова за 30 секунд ✨
          </p>
        </div>

        {step !== 'processing' && step !== 'results' && (
          <div className="mb-8 flex justify-center gap-2">
            {['source', 'cities', 'goal', 'intents'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-110 shadow-lg' : 
                  ['source', 'cities', 'goal', 'intents'].indexOf(step) > idx ? 'bg-green-500 text-white' : 'bg-white/60 backdrop-blur text-gray-400 border-2 border-gray-200'
                }`}>
                  {['source', 'cities', 'goal', 'intents'].indexOf(step) > idx ? '✓' : idx + 1}
                </div>
                {idx < 3 && <div className={`w-12 h-1 rounded transition-all ${
                  ['source', 'cities', 'goal', 'intents'].indexOf(step) > idx ? 'bg-green-500' : 'bg-gray-200'
                }`} />}
              </div>
            ))}
          </div>
        )}

        <Card className="shadow-2xl backdrop-blur-sm bg-white/80 border-0">
          {step === 'source' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                    <Icon name="FileText" size={24} className="text-white" />
                  </div>
                  Откуда взять ключи?
                </CardTitle>
                <CardDescription className="text-base">
                  Выберите источник для сбора семантического ядра
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all hover:scale-105 ${source === 'manual' ? 'ring-4 ring-blue-500 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100' : 'hover:shadow-lg bg-white'}`}
                    onClick={() => setSource('manual')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl inline-block mb-4">
                        <Icon name="Edit" size={40} className="text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Вставить вручную</h3>
                      <p className="text-sm text-muted-foreground">Есть список из Wordstat</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all hover:scale-105 ${source === 'website' ? 'ring-4 ring-purple-500 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100' : 'hover:shadow-lg bg-white'}`}
                    onClick={() => setSource('website')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl inline-block mb-4">
                        <Icon name="Globe" size={40} className="text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Указать сайт</h3>
                      <p className="text-sm text-muted-foreground">AI найдёт базисы сам</p>
                    </CardContent>
                  </Card>
                </div>

                {source === 'manual' && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Ключевые слова (каждое с новой строки)</Label>
                    <textarea
                      className="w-full min-h-[280px] p-4 border-2 rounded-xl resize-y font-mono text-sm focus:ring-4 focus:ring-blue-200 transition-all"
                      placeholder="купить квартиру&#10;купить квартиру в москве&#10;купить квартиру от застройщика&#10;купить квартиру вторичку"
                      value={manualKeywords}
                      onChange={(e) => setManualKeywords(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-lg">💡</span>
                      Введите базовые запросы — AI кластеризует автоматически
                    </p>
                  </div>
                )}

                {source === 'website' && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">URL сайта</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="h-14 text-base border-2 focus:ring-4 focus:ring-purple-200"
                    />
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      AI проанализирует сайт и соберёт ключи автоматически
                    </p>
                  </div>
                )}

                <Button onClick={handleNext} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                  Далее <Icon name="ArrowRight" size={24} className="ml-2" />
                </Button>
              </CardContent>
            </>
          )}

          {step === 'cities' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                    <Icon name="MapPin" size={24} className="text-white" />
                  </div>
                  География
                </CardTitle>
                <CardDescription className="text-base">
                  Для каких регионов собираем ключи?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">Выбранные города ({selectedCities.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-3 min-h-[60px] p-4 border-2 border-dashed rounded-xl bg-gradient-to-br from-gray-50 to-blue-50">
                    {selectedCities.map(city => (
                      <Badge key={city.id} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all">
                        {city.name}
                        <Icon 
                          name="X" 
                          size={16} 
                          className="ml-2 cursor-pointer hover:bg-white/20 rounded-full p-0.5" 
                          onClick={(e) => { e.stopPropagation(); removeCity(city.id); }}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Добавить город</Label>
                  <Input
                    placeholder="🔍 Начните вводить название города..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="h-12 border-2 focus:ring-4 focus:ring-green-200"
                  />
                  {citySearch && filteredCities.length > 0 && (
                    <div className="border-2 rounded-xl max-h-[240px] overflow-y-auto shadow-inner bg-white">
                      {filteredCities.slice(0, 10).map(city => (
                        <div
                          key={city.id}
                          className="p-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 cursor-pointer border-b last:border-b-0 transition-all"
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

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="w-full h-12 border-2">
                    <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg">
                    Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'goal' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                    <Icon name="Target" size={24} className="text-white" />
                  </div>
                  Цель использования
                </CardTitle>
                <CardDescription className="text-base">
                  Для чего собираем ключи?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all hover:scale-105 ${goal === 'context' ? 'ring-4 ring-orange-500 shadow-xl bg-gradient-to-br from-orange-50 to-red-50' : 'hover:shadow-lg bg-white'}`}
                    onClick={() => setGoal('context')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl inline-block mb-4">
                        <Icon name="MousePointerClick" size={40} className="text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">Яндекс.Директ</h3>
                      <p className="text-sm text-muted-foreground">Контекстная реклама</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all hover:scale-105 ${goal === 'seo' ? 'ring-4 ring-green-500 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50' : 'hover:shadow-lg bg-white'}`}
                    onClick={() => setGoal('seo')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl inline-block mb-4">
                        <Icon name="TrendingUp" size={40} className="text-white" />
                      </div>
                      <h3 className="font-bold text-xl mb-2">SEO-продвижение</h3>
                      <p className="text-sm text-muted-foreground">Органический трафик</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    {goal === 'context' ? 'Для Директа:' : 'Для SEO:'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {goal === 'context' 
                      ? 'Информационные запросы ("как купить") автоматически попадут в минус-слова'
                      : 'Информационные запросы останутся — делаем из них статьи'
                    }
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="w-full h-12 border-2">
                    <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg">
                    Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'intents' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Icon name="ListFilter" size={24} className="text-white" />
                  </div>
                  Типы запросов
                </CardTitle>
                <CardDescription className="text-base">
                  Какие интенты нужны?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {INTENT_TYPES.map(intent => (
                    <Card 
                      key={intent.id}
                      className={`cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedIntents.includes(intent.id) ? 'ring-4 ring-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg' : 'hover:shadow-md bg-white'
                      }`}
                      onClick={() => toggleIntent(intent.id)}
                    >
                      <CardContent className="p-5 flex items-start gap-4">
                        <Checkbox 
                          checked={selectedIntents.includes(intent.id)}
                          className="mt-1.5 h-6 w-6"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">{intent.emoji}</span>
                            <h3 className="font-bold text-lg">{intent.label}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{intent.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-5 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl">
                  <p className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Для Директа:
                  </p>
                  <p className="text-sm text-yellow-700">
                    Оставьте только <strong>Коммерческие</strong> и <strong>Транзакционные</strong> — они конвертируют в заявки
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="w-full h-12 border-2">
                    <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg">
                    <Icon name="Sparkles" size={20} className="mr-2" />
                    Создать кластеры
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'processing' && (
            <CardContent className="p-12">
              <div className="text-center space-y-8">
                <div className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                  <Icon name="Sparkles" size={64} className="text-purple-600 animate-pulse" />
                </div>
                
                <div>
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {PROCESSING_STAGES[currentStage]?.label || 'Обработка...'}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    OpenAI анализирует ваши ключи
                  </p>
                </div>

                <div className="space-y-3">
                  <Progress value={processingProgress} className="h-4" />
                  <p className="text-2xl font-bold text-purple-600">{Math.round(processingProgress)}%</p>
                </div>

                <div className="flex justify-center gap-2">
                  {PROCESSING_STAGES.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 w-12 rounded-full transition-all ${
                        idx <= currentStage ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          )}

          {step === 'results' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                    <Icon name="CheckCircle2" size={24} className="text-white" />
                  </div>
                  Готово!
                </CardTitle>
                <CardDescription className="text-base">
                  OpenAI создал кластеры и минус-слова
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-1">{clusters.length}</div>
                      <div className="text-sm text-muted-foreground">Кластеров</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl font-bold text-green-600 mb-1">{totalPhrases}</div>
                      <div className="text-sm text-muted-foreground">Ключевых фраз</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl font-bold text-red-600 mb-1">{minusWords.length}</div>
                      <div className="text-sm text-muted-foreground">Минус-слов</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Кластеры</h3>
                    <Button onClick={exportClusters} size="sm" variant="outline">
                      <Icon name="Download" size={16} className="mr-2" />
                      Экспорт
                    </Button>
                  </div>
                  
                  {clusters.map((cluster, idx) => (
                    <Card key={idx} className="border-2 hover:shadow-lg transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-lg">{cluster.name}</h4>
                          <Badge className={cluster.color}>{cluster.intent}</Badge>
                        </div>
                        <div className="space-y-2">
                          {cluster.phrases.map((phrase, pidx) => (
                            <div key={pidx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <span className="text-sm">{phrase.phrase}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {phrase.count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-red-600">Минус-слова</h3>
                    <Button onClick={exportMinusWords} size="sm" variant="outline" className="border-red-200">
                      <Icon name="Download" size={16} className="mr-2" />
                      Экспорт
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                    {minusWords.map((word, idx) => (
                      <Badge key={idx} className="bg-red-600 text-white px-3 py-1.5 font-mono">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setStep('source')} variant="outline" className="w-full h-12 border-2">
                  <Icon name="RotateCcw" size={20} className="mr-2" />
                  Начать заново
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
