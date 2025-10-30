import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

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

type Step = 'input' | 'results';

const minusWordsMock: string[] = [
  'бесплатно',
  'даром',
  'своими руками',
  'самому',
  'игра',
  'в игре',
  'скачать',
  'торрент',
  'порно',
  'xxx',
  'вакансия',
  'работа'
];

const aiClustersMock: Cluster[] = [
  {
    name: 'Вторичный рынок',
    intent: 'commercial',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'Home',
    phrases: [
      { phrase: 'купить квартиру вторичку', count: 12000 },
      { phrase: 'купить квартиру вторичный рынок', count: 3800 },
      { phrase: 'купить квартиру вторичное жилье', count: 2900 },
      { phrase: 'купить квартиру от собственника', count: 11000 },
      { phrase: 'купить квартиру без посредников', count: 14000 }
    ]
  },
  {
    name: 'Новостройки от застройщика',
    intent: 'commercial',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'Building2',
    phrases: [
      { phrase: 'купить квартиру от застройщика', count: 8500 },
      { phrase: 'купить квартиру новостройка', count: 15000 },
      { phrase: 'купить квартиру в новостройке москва', count: 6200 },
      { phrase: 'купить квартиру у застройщика', count: 11000 },
      { phrase: 'купить квартиру на первичном рынке', count: 6800 },
      { phrase: 'купить квартиру первичка', count: 4200 },
      { phrase: 'купить квартиру пик', count: 8900 },
      { phrase: 'купить квартиру самолет', count: 7200 },
      { phrase: 'купить квартиру лср', count: 5600 },
      { phrase: 'купить квартиру эталон', count: 4500 }
    ]
  },
  {
    name: 'Агрегаторы и площадки',
    intent: 'informational',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'Globe',
    phrases: [
      { phrase: 'купить квартиру авито', count: 19000 },
      { phrase: 'купить квартиру циан', count: 16500 },
      { phrase: 'купить квартиру домклик', count: 8200 }
    ]
  },
  {
    name: 'География: Москва',
    intent: 'commercial',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: 'MapPin',
    phrases: [
      { phrase: 'купить квартиру в москве', count: 45000 },
      { phrase: 'купить квартиру недорого москва', count: 7200 },
      { phrase: 'купить квартиру центр москвы', count: 9800 },
      { phrase: 'купить квартиру в центре', count: 14000 },
      { phrase: 'купить квартиру юао', count: 4200 },
      { phrase: 'купить квартиру сао', count: 3800 },
      { phrase: 'купить квартиру свао', count: 4100 }
    ]
  },
  {
    name: 'География: Подмосковье',
    intent: 'commercial',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: 'Map',
    phrases: [
      { phrase: 'купить квартиру в подмосковье', count: 8900 },
      { phrase: 'купить квартиру московская область', count: 5600 }
    ]
  },
  {
    name: 'Планировка: 1-комнатные',
    intent: 'commercial',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'Square',
    phrases: [
      { phrase: 'купить однокомнатную квартиру', count: 32000 },
      { phrase: 'купить квартиру 1 комнатную', count: 25000 },
      { phrase: 'купить студию', count: 12000 },
      { phrase: 'купить квартиру студию', count: 9500 }
    ]
  },
  {
    name: 'Планировка: 2-комнатные',
    intent: 'commercial',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'LayoutGrid',
    phrases: [
      { phrase: 'купить двухкомнатную квартиру', count: 28000 },
      { phrase: 'купить квартиру 2 комнатную', count: 21000 }
    ]
  },
  {
    name: 'Планировка: 3-комнатные',
    intent: 'commercial',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'Grid3x3',
    phrases: [
      { phrase: 'купить трехкомнатную квартиру', count: 15000 }
    ]
  },
  {
    name: 'Финансирование: Ипотека',
    intent: 'commercial',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: 'CreditCard',
    phrases: [
      { phrase: 'купить квартиру в ипотеку', count: 35000 },
      { phrase: 'купить квартиру ипотека', count: 28000 },
      { phrase: 'купить квартиру материнский капитал', count: 8900 },
      { phrase: 'купить квартиру в кредит', count: 12000 }
    ]
  },
  {
    name: 'Финансы: Цена и бюджет',
    intent: 'commercial',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: 'DollarSign',
    phrases: [
      { phrase: 'купить квартиру недорого', count: 18000 },
      { phrase: 'купить квартиру цена', count: 22000 },
      { phrase: 'купить квартиру стоимость', count: 9800 }
    ]
  },
  {
    name: 'Расположение: Метро',
    intent: 'commercial',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'Train',
    phrases: [
      { phrase: 'купить квартиру рядом с метро', count: 8500 },
      { phrase: 'купить квартиру у метро', count: 6200 }
    ]
  },
  {
    name: 'Состояние: Ремонт',
    intent: 'commercial',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'Wrench',
    phrases: [
      { phrase: 'купить квартиру с ремонтом', count: 16000 },
      { phrase: 'купить квартиру без ремонта', count: 7800 },
      { phrase: 'купить квартиру под ремонт', count: 5200 },
      { phrase: 'купить квартиру с мебелью', count: 6500 }
    ]
  },
  {
    name: 'Срочность покупки',
    intent: 'commercial',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: 'Zap',
    phrases: [
      { phrase: 'купить квартиру срочно', count: 9200 },
      { phrase: 'купить квартиру срочная продажа', count: 4800 }
    ]
  },
  {
    name: 'Нерелевантные запросы',
    intent: 'informational',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'XCircle',
    phrases: [
      { phrase: 'купить квартиру бесплатно', count: 1200 },
      { phrase: 'купить квартиру даром', count: 800 },
      { phrase: 'купить квартиру своими руками', count: 2100 },
      { phrase: 'как купить квартиру самому', count: 3500 },
      { phrase: 'купить квартиру игра', count: 5600 },
      { phrase: 'купить квартиру в игре', count: 4200 },
      { phrase: 'скачать купить квартиру', count: 900 },
      { phrase: 'купить квартиру торрент', count: 450 },
      { phrase: 'купить квартиру порно', count: 320 },
      { phrase: 'купить квартиру xxx', count: 180 },
      { phrase: 'вакансия купить квартиру', count: 1100 },
      { phrase: 'работа купить квартиру', count: 890 }
    ]
  },
  {
    name: 'Общие запросы',
    intent: 'informational',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'Search',
    phrases: [
      { phrase: 'купить квартиру', count: 125000 }
    ]
  }
];

export default function TestClustering() {
  const [step, setStep] = useState<Step>('input');
  const [keywords, setKeywords] = useState('купить квартиру');
  const [loading, setLoading] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [clusters] = useState<Cluster[]>(aiClustersMock);
  const [minusWords] = useState<string[]>(minusWordsMock);
  const { toast } = useToast();

  const toggleCluster = (name: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      setExpandedClusters(new Set([...clusters.map(c => c.name), 'minus-words']));
      setStep('results');
      setLoading(false);
      toast({ 
        title: 'Готово!', 
        description: `Найдено ${clusters.length} кластеров и ${minusWords.length} минус-слов` 
      });
    }, 2000);
  };

  const exportMinusWords = () => {
    const minusText = minusWords.join('\n');
    const blob = new Blob([minusText], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `минус-слова_демо_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast({ title: 'Экспорт завершен', description: `${minusWords.length} минус-слов для Директа` });
  };

  const exportToCSV = () => {
    let csv = 'Кластер,Фраза,Частотность\n';
    clusters.forEach(cluster => {
      cluster.phrases.forEach(phrase => {
        csv += `"${cluster.name}","${phrase.phrase}",${phrase.count}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_демо_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Экспорт завершен', description: 'CSV файл загружен' });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);
  const totalShows = clusters.reduce((sum, c) => sum + c.phrases.reduce((s, p) => s + p.count, 0), 0);

  if (step === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Icon name="Sparkles" size={32} className="text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">AI-Кластеризация</h1>
                <p className="text-muted-foreground mt-1">
                  Визуализация кластеризации фраз через OpenAI (демо режим)
                </p>
              </div>
            </div>
          </div>

          <Card className="p-8 space-y-6 border-2 shadow-lg">
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Icon name="FileText" size={16} />
                Ключевые слова
              </label>
              <Textarea
                placeholder="купить квартиру"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={8}
                className="font-mono text-base resize-none"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0" />
                <span>Это демо режим. Результат фиксированный для "купить квартиру"</span>
              </div>
            </div>

            <Button 
              onClick={handleAnalyze} 
              disabled={loading}
              className="w-full h-14 text-base font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={22} className="animate-spin mr-2" />
                  Имитация AI-анализа...
                </>
              ) : (
                <>
                  <Icon name="Sparkles" size={22} className="mr-2" />
                  Показать демо результат
                </>
              )}
            </Button>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Icon name="Lightbulb" size={24} className="text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-blue-900">Что покажет демо?</h3>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>14 умных кластеров по смыслу</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Минус-слова для Директа</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Разделение по планировкам</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="Check" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Экспорт в CSV и TXT</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <Icon name="Zap" size={24} className="text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-emerald-900">Преимущества AI</h3>
                  <ul className="text-sm text-emerald-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <Icon name="TrendingUp" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Точность 90% vs 60% в TF-IDF</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="Clock" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Экономия 3-4 часов работы</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="Target" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Понимает смысл и интент</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="Shield" size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Автоматическое определение мусора</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon name="Sparkles" size={28} className="text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Результаты кластеризации</h1>
            </div>
            <p className="text-muted-foreground ml-14">
              Демо анализ для "{keywords}"
            </p>
          </div>
          <Button 
            onClick={() => setStep('input')} 
            variant="outline"
            className="gap-2"
          >
            <Icon name="ArrowLeft" size={18} />
            Назад
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Icon name="Layers" size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{clusters.length}</div>
                <div className="text-sm text-blue-700">Кластеров</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Icon name="FileText" size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-900">{totalPhrases}</div>
                <div className="text-sm text-emerald-700">Фраз</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Icon name="TrendingUp" size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">{totalShows.toLocaleString()}</div>
                <div className="text-sm text-purple-700">Показов</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 rounded-lg">
                <Icon name="XCircle" size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-900">{minusWords.length}</div>
                <div className="text-sm text-rose-700">Минус-слов</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={exportToCSV} variant="default" className="gap-2">
            <Icon name="Download" size={18} />
            Экспорт в CSV
          </Button>
          <Button onClick={exportMinusWords} variant="outline" className="gap-2">
            <Icon name="FileDown" size={18} />
            Скачать минус-слова
          </Button>
          <Button 
            onClick={() => setExpandedClusters(new Set(clusters.map(c => c.name)))}
            variant="outline"
            className="gap-2"
          >
            <Icon name="ChevronsDown" size={18} />
            Развернуть все
          </Button>
          <Button 
            onClick={() => setExpandedClusters(new Set())}
            variant="outline"
            className="gap-2"
          >
            <Icon name="ChevronsUp" size={18} />
            Свернуть все
          </Button>
        </div>

        <div className="space-y-4">
          {clusters.map((cluster, idx) => {
            const isExpanded = expandedClusters.has(cluster.name);
            const totalCount = cluster.phrases.reduce((sum, p) => sum + p.count, 0);

            return (
              <Card 
                key={idx} 
                className={`overflow-hidden border-2 transition-all hover:shadow-lg ${isExpanded ? 'shadow-md' : ''}`}
              >
                <button
                  onClick={() => toggleCluster(cluster.name)}
                  className="w-full p-6 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${cluster.color}`}>
                        <Icon name={cluster.icon as any} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold">{cluster.name}</h3>
                          <Badge variant={cluster.intent === 'commercial' ? 'default' : 'secondary'} className="text-xs">
                            {cluster.intent === 'commercial' ? 'Коммерческий' : 'Инфо'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="FileText" size={14} />
                            {cluster.phrases.length} фраз
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="TrendingUp" size={14} />
                            {totalCount.toLocaleString()} показов
                          </span>
                        </div>
                      </div>
                    </div>
                    <Icon 
                      name={isExpanded ? 'ChevronUp' : 'ChevronDown'} 
                      size={24} 
                      className="text-muted-foreground flex-shrink-0"
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    <div className="p-6 space-y-2">
                      {cluster.phrases.map((phrase, pIdx) => (
                        <div 
                          key={pIdx}
                          className="flex items-center justify-between p-3 bg-background rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <span className="font-medium">{phrase.phrase}</span>
                          <Badge variant="outline" className="ml-4">
                            <Icon name="TrendingUp" size={12} className="mr-1" />
                            {phrase.count.toLocaleString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          <Card className="overflow-hidden border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50">
            <button
              onClick={() => {
                const key = 'minus-words';
                setExpandedClusters(prev => {
                  const next = new Set(prev);
                  if (next.has(key)) {
                    next.delete(key);
                  } else {
                    next.add(key);
                  }
                  return next;
                });
              }}
              className="w-full p-6 text-left hover:bg-rose-100/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500 rounded-xl">
                    <Icon name="ShieldX" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-rose-900">Минус-слова для Директа</h3>
                      <Badge className="bg-rose-600">
                        {minusWords.length} слов
                      </Badge>
                    </div>
                    <p className="text-sm text-rose-700">
                      Автоматически отфильтрованные нецелевые запросы
                    </p>
                  </div>
                </div>
                <Icon 
                  name={expandedClusters.has('minus-words') ? 'ChevronUp' : 'ChevronDown'} 
                  size={24} 
                  className="text-rose-700"
                />
              </div>
            </button>

            {expandedClusters.has('minus-words') && (
              <div className="border-t border-rose-200 bg-white">
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {minusWords.map((word, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary"
                        className="bg-rose-100 text-rose-900 border-rose-200 px-3 py-1"
                      >
                        -{word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
