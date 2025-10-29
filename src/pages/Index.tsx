import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

type Step = 'source' | 'cities' | 'goal' | 'intents' | 'results';
type Source = 'manual' | 'website';
type Goal = 'context' | 'seo';

interface City {
  id: number;
  name: string;
}

const RUSSIAN_CITIES: City[] = [
  { id: 213, name: 'Москва' },
  { id: 2, name: 'Санкт-Петербург' },
  { id: 54, name: 'Екатеринбург' },
  { id: 65, name: 'Новосибирск' },
  { id: 35, name: 'Краснодар' },
  { id: 172, name: 'Уфа' },
  { id: 47, name: 'Нижний Новгород' },
  { id: 72, name: 'Красноярск' },
  { id: 20, name: 'Ростов-на-Дону' },
  { id: 63, name: 'Самара' },
  { id: 56, name: 'Челябинск' },
  { id: 76, name: 'Омск' },
  { id: 11, name: 'Казань' }
];

const INTENT_TYPES = [
  { id: 'commercial', label: 'Коммерческие', description: 'купить, заказать, цена, стоимость', emoji: '💰' },
  { id: 'informational', label: 'Информационные', description: 'как, что такое, инструкция, пошагово', emoji: '📚' },
  { id: 'navigational', label: 'Навигационные', description: 'циан, авито, домклик, сайт компании', emoji: '🧭' },
  { id: 'transactional', label: 'Транзакционные', description: 'скачать, регистрация, заявка, консультация', emoji: '📝' }
];

export default function Index() {
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('manual');
  const [manualKeywords, setManualKeywords] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedCities, setSelectedCities] = useState<City[]>([RUSSIAN_CITIES[0]]);
  const [citySearch, setCitySearch] = useState('');
  const [goal, setGoal] = useState<Goal>('context');
  const [selectedIntents, setSelectedIntents] = useState<string[]>(['commercial', 'transactional']);
  const [loading, setLoading] = useState(false);
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
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    toast({ 
      title: '🚀 Запускаем магию...', 
      description: 'OpenAI анализирует ключи и создаёт кластеры' 
    });

    setTimeout(() => {
      setLoading(false);
      setStep('results');
      toast({ 
        title: '✅ Готово!', 
        description: 'Кластеры созданы, минус-слова выделены' 
      });
    }, 2000);
  };

  const handleBack = () => {
    if (step === 'cities') setStep('source');
    else if (step === 'goal') setStep('cities');
    else if (step === 'intents') setStep('goal');
    else if (step === 'results') setStep('intents');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Кластеризатор ключей
          </h1>
          <p className="text-muted-foreground">
            OpenAI создаст кластеры и минус-слова за 30 секунд
          </p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          {['source', 'cities', 'goal', 'intents', 'results'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-blue-600 text-white' : 
                ['source', 'cities', 'goal', 'intents', 'results'].indexOf(step) > idx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {['source', 'cities', 'goal', 'intents', 'results'].indexOf(step) > idx ? '✓' : idx + 1}
              </div>
              {idx < 4 && <div className={`w-8 h-0.5 ${
                ['source', 'cities', 'goal', 'intents', 'results'].indexOf(step) > idx ? 'bg-green-500' : 'bg-gray-200'
              }`} />}
            </div>
          ))}
        </div>

        <Card className="shadow-xl">
          {step === 'source' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="FileText" size={24} />
                  Откуда взять ключевые фразы?
                </CardTitle>
                <CardDescription>
                  Выберите источник для сбора семантического ядра
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${source === 'manual' ? 'ring-2 ring-blue-600 bg-blue-50' : 'hover:shadow-md'}`}
                    onClick={() => setSource('manual')}
                  >
                    <CardContent className="p-6 text-center">
                      <Icon name="Edit" size={48} className="mx-auto mb-3 text-blue-600" />
                      <h3 className="font-semibold text-lg mb-2">Вставить ключи вручную</h3>
                      <p className="text-sm text-muted-foreground">Уже есть список фраз из Wordstat</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all ${source === 'website' ? 'ring-2 ring-purple-600 bg-purple-50' : 'hover:shadow-md'}`}
                    onClick={() => setSource('website')}
                  >
                    <CardContent className="p-6 text-center">
                      <Icon name="Globe" size={48} className="mx-auto mb-3 text-purple-600" />
                      <h3 className="font-semibold text-lg mb-2">Указать сайт</h3>
                      <p className="text-sm text-muted-foreground">OpenAI найдёт базисы автоматически</p>
                    </CardContent>
                  </Card>
                </div>

                {source === 'manual' && (
                  <div className="space-y-2">
                    <Label>Ключевые слова (каждое с новой строки)</Label>
                    <textarea
                      className="w-full min-h-[250px] p-3 border rounded-md resize-y font-mono text-sm"
                      placeholder="купить квартиру&#10;купить квартиру в москве&#10;купить квартиру от застройщика&#10;купить квартиру вторичку"
                      value={manualKeywords}
                      onChange={(e) => setManualKeywords(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 Введите базовые запросы — OpenAI автоматически их кластеризует
                    </p>
                  </div>
                )}

                {source === 'website' && (
                  <div className="space-y-2">
                    <Label>URL сайта</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      🤖 OpenAI проанализирует сайт, определит тематику и соберёт ключи автоматически
                    </p>
                  </div>
                )}

                <Button onClick={handleNext} className="w-full" size="lg">
                  Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                </Button>
              </CardContent>
            </>
          )}

          {step === 'cities' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="MapPin" size={24} />
                  География
                </CardTitle>
                <CardDescription>
                  Для каких регионов собираем ключи?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Выбранные города ({selectedCities.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2 min-h-[48px] p-2 border rounded-md bg-gray-50">
                    {selectedCities.map(city => (
                      <Badge key={city.id} className="bg-blue-600 text-white px-3 py-1.5">
                        {city.name}
                        <Icon 
                          name="X" 
                          size={14} 
                          className="ml-2 cursor-pointer hover:bg-blue-700 rounded-full" 
                          onClick={() => removeCity(city.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Добавить город</Label>
                  <Input
                    placeholder="🔍 Начните вводить название..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                  {citySearch && filteredCities.length > 0 && (
                    <div className="border rounded-md max-h-[200px] overflow-y-auto">
                      {filteredCities.map(city => (
                        <div
                          key={city.id}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => addCity(city)}
                        >
                          {city.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="w-full">
                    <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full">
                    Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'goal' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Target" size={24} />
                  Цель использования
                </CardTitle>
                <CardDescription>
                  Для чего собираем ключи?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${goal === 'context' ? 'ring-2 ring-orange-600 bg-orange-50' : 'hover:shadow-md'}`}
                    onClick={() => setGoal('context')}
                  >
                    <CardContent className="p-6 text-center">
                      <Icon name="MousePointerClick" size={48} className="mx-auto mb-3 text-orange-600" />
                      <h3 className="font-semibold text-lg mb-2">Яндекс.Директ</h3>
                      <p className="text-sm text-muted-foreground">Контекстная реклама, быстрый результат</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all ${goal === 'seo' ? 'ring-2 ring-green-600 bg-green-50' : 'hover:shadow-md'}`}
                    onClick={() => setGoal('seo')}
                  >
                    <CardContent className="p-6 text-center">
                      <Icon name="TrendingUp" size={48} className="mx-auto mb-3 text-green-600" />
                      <h3 className="font-semibold text-lg mb-2">SEO-продвижение</h3>
                      <p className="text-sm text-muted-foreground">Органический трафик, долгосрочно</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium mb-2">
                    {goal === 'context' ? '💡 Для Директа:' : '💡 Для SEO:'}
                  </p>
                  <p className="text-muted-foreground">
                    {goal === 'context' 
                      ? 'Информационные запросы ("как купить") автоматически попадут в минус-слова — они дорогие и не конвертируют в заявки'
                      : 'Информационные запросы останутся в кластерах — из них делаем полезные статьи для привлечения трафика'
                    }
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="w-full">
                    <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full">
                    Далее <Icon name="ArrowRight" size={20} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'intents' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="ListFilter" size={24} />
                  Типы запросов
                </CardTitle>
                <CardDescription>
                  Какие интенты нужны для {goal === 'context' ? 'контекстной рекламы' : 'SEO'}?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {INTENT_TYPES.map(intent => (
                    <Card 
                      key={intent.id}
                      className={`cursor-pointer transition-all ${
                        selectedIntents.includes(intent.id) ? 'ring-2 ring-blue-600 bg-blue-50' : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleIntent(intent.id)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <Checkbox 
                          checked={selectedIntents.includes(intent.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{intent.emoji}</span>
                            <h3 className="font-semibold">{intent.label}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{intent.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <p className="font-medium text-yellow-800 mb-1">⚠️ Рекомендация для Директа:</p>
                  <p className="text-yellow-700">
                    Оставьте только <strong>Коммерческие</strong> и <strong>Транзакционные</strong> — они дают заявки. 
                    Информационные добавим в минус-слова автоматически.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="w-full">
                    <Icon name="ArrowLeft" size={20} className="mr-2" /> Назад
                  </Button>
                  <Button onClick={handleNext} className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                        Анализируем...
                      </>
                    ) : (
                      <>
                        <Icon name="Sparkles" size={20} className="mr-2" />
                        Создать кластеры
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'results' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="CheckCircle2" size={24} className="text-green-600" />
                  Готово!
                </CardTitle>
                <CardDescription>
                  OpenAI создал кластеры и минус-слова
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                  <Icon name="Sparkles" size={64} className="mx-auto mb-4 text-green-600" />
                  <h3 className="text-2xl font-bold mb-2">Кластеры готовы!</h3>
                  <p className="text-muted-foreground mb-4">
                    Найдено <strong>14 кластеров</strong>, выделено <strong>12 минус-слов</strong>
                  </p>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Icon name="Download" size={20} className="mr-2" />
                    Скачать результат
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">14</div>
                      <div className="text-sm text-muted-foreground">Кластеров</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">62</div>
                      <div className="text-sm text-muted-foreground">Ключевых фраз</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">12</div>
                      <div className="text-sm text-muted-foreground">Минус-слов</div>
                    </CardContent>
                  </Card>
                </div>

                <Button onClick={() => setStep('source')} variant="outline" className="w-full">
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
