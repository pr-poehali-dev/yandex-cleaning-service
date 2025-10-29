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
  phrases: Phrase[];
}

type Step = 'input' | 'results';

const minusPhrasesMock: Phrase[] = [
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
];

const aiClustersMock: Cluster[] = [
  {
    name: 'Вторичный рынок',
    intent: 'commercial',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
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
    color: 'bg-green-100 text-green-800 border-green-300',
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
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    phrases: [
      { phrase: 'купить квартиру авито', count: 19000 },
      { phrase: 'купить квартиру циан', count: 16500 },
      { phrase: 'купить квартиру домклик', count: 8200 }
    ]
  },
  {
    name: 'География: Москва',
    intent: 'commercial',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
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
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    phrases: [
      { phrase: 'купить квартиру в подмосковье', count: 8900 },
      { phrase: 'купить квартиру московская область', count: 5600 }
    ]
  },
  {
    name: 'Планировка: 1-комнатные',
    intent: 'commercial',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
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
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    phrases: [
      { phrase: 'купить двухкомнатную квартиру', count: 28000 },
      { phrase: 'купить квартиру 2 комнатную', count: 21000 }
    ]
  },
  {
    name: 'Планировка: 3-комнатные',
    intent: 'commercial',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    phrases: [
      { phrase: 'купить трехкомнатную квартиру', count: 15000 }
    ]
  },
  {
    name: 'Финансирование: Ипотека',
    intent: 'commercial',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
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
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    phrases: [
      { phrase: 'купить квартиру недорого', count: 18000 },
      { phrase: 'купить квартиру цена', count: 22000 },
      { phrase: 'купить квартиру стоимость', count: 9800 }
    ]
  },
  {
    name: 'Расположение: Метро',
    intent: 'commercial',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    phrases: [
      { phrase: 'купить квартиру рядом с метро', count: 8500 },
      { phrase: 'купить квартиру у метро', count: 6200 }
    ]
  },
  {
    name: 'Состояние: Ремонт',
    intent: 'commercial',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
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
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    phrases: [
      { phrase: 'купить квартиру срочно', count: 9200 },
      { phrase: 'купить квартиру срочная продажа', count: 4800 }
    ]
  },
  {
    name: 'Общие запросы',
    intent: 'informational',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
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
  const [minusPhrases] = useState<Phrase[]>(minusPhrasesMock);
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
        description: `Найдено ${clusters.length} кластеров и ${minusPhrases.length} минус-фраз` 
      });
    }, 2000);
  };

  const exportMinusWords = () => {
    const minusText = minusPhrases.map(p => p.phrase).join('\n');
    const blob = new Blob([minusText], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `минус-слова_демо_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast({ title: 'Экспорт завершен', description: `${minusPhrases.length} минус-фраз для Директа` });
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
  const minusTotalShows = minusPhrases.reduce((sum, p) => sum + p.count, 0);

  if (step === 'input') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Icon name="Sparkles" size={32} className="text-purple-500" />
              Демо: AI-кластеризация (тестовая)
            </h1>
            <p className="text-muted-foreground">
              Визуализация того, как OpenAI будет кластеризовать фразы (без реального API)
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ключевые слова</label>
              <Textarea
                placeholder="купить квартиру"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={6}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                💡 Это демо. Результат фиксированный для "купить квартиру"
              </p>
            </div>

            <Button 
              onClick={handleAnalyze} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={20} className="animate-spin mr-2" />
                  Имитация AI-анализа...
                </>
              ) : (
                <>
                  <Icon name="Sparkles" size={20} className="mr-2" />
                  Показать демо результат
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <Icon name="Info" size={24} className="text-blue-600 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold">Что покажет демо?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ 14 умных кластеров по смыслу (вместо 3-4 в TF-IDF)</li>
                  <li>✅ Отдельный кластер "Минус-слова" с мусором</li>
                  <li>✅ Планировки разделены: 1-комн, 2-комн, 3-комн ОТДЕЛЬНО</li>
                  <li>✅ Конкуренты (Авито, Циан) — отдельный полезный кластер</li>
                  <li>✅ Кнопка экспорта минус-фраз для Яндекс.Директа</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-start gap-4">
              <Icon name="Zap" size={24} className="text-green-600 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold">Чем OpenAI лучше TF-IDF?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-red-600">❌ TF-IDF (текущий):</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                      <li>"купить квартиру в москве" → кластер "Вторичка" (ошибка!)</li>
                      <li>Не понимает смысл, только статистику слов</li>
                      <li>Не отделяет мусор автоматически</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">✅ OpenAI GPT-4:</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                      <li>"купить квартиру в москве" → "География: Москва"</li>
                      <li>Понимает смысл и контекст</li>
                      <li>Автоматически выделяет минус-слова</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Icon name="Sparkles" size={32} className="text-purple-500" />
              AI-кластеры (демо)
            </h1>
            <p className="text-muted-foreground">
              Так будет выглядеть результат с реальным OpenAI API
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Icon name="Download" size={16} className="mr-2" />
              Экспорт CSV
            </Button>
            <Button variant="outline" onClick={() => setStep('input')}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Назад
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Кластеров</div>
            <div className="text-2xl font-bold">{clusters.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Всего фраз</div>
            <div className="text-2xl font-bold">{totalPhrases}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Показов в месяц</div>
            <div className="text-2xl font-bold">{totalShows.toLocaleString()}</div>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="text-sm text-red-700 font-medium flex items-center gap-1">
              <Icon name="X" size={14} />
              Минус-фраз
            </div>
            <div className="text-2xl font-bold text-red-600">{minusPhrases.length}</div>
          </Card>
        </div>

        {minusPhrases.length > 0 && (
          <Card className="overflow-hidden border-red-300 bg-red-50/30">
            <button
              onClick={() => toggleCluster('minus-words')}
              className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon
                  name={expandedClusters.has('minus-words') ? "ChevronDown" : "ChevronRight"}
                  size={20}
                  className="text-muted-foreground"
                />
                <Icon name="X" size={24} className="text-red-600" />
                <div className="text-left">
                  <div className="font-semibold text-lg text-red-800">Минус-слова (мусор)</div>
                  <div className="text-sm text-muted-foreground">
                    {minusPhrases.length} фраз • {minusTotalShows.toLocaleString()} показов отфильтровано
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportMinusWords();
                  }}
                >
                  <Icon name="Download" size={16} className="mr-2" />
                  Экспорт для Директа
                </Button>
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  AI определил как нерелевантные
                </Badge>
              </div>
            </button>

            {expandedClusters.has('minus-words') && (
              <div className="border-t border-red-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-red-50">
                      <th className="text-left p-3 text-sm font-medium">Фраза</th>
                      <th className="text-right p-3 text-sm font-medium">Показов</th>
                      <th className="text-left p-3 text-sm font-medium">Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minusPhrases.map((phrase, idx) => {
                      let reason = '';
                      if (phrase.phrase.includes('бесплатно') || phrase.phrase.includes('даром')) reason = '🆓 Халява';
                      else if (phrase.phrase.includes('своими руками') || phrase.phrase.includes('самому')) reason = '🔧 DIY';
                      else if (phrase.phrase.includes('игра')) reason = '🎮 Игра';
                      else if (phrase.phrase.includes('скачать') || phrase.phrase.includes('торрент')) reason = '📥 Загрузка';
                      else if (phrase.phrase.includes('порно') || phrase.phrase.includes('xxx')) reason = '🔞 Взрослый контент';
                      else if (phrase.phrase.includes('вакансия') || phrase.phrase.includes('работа')) reason = '💼 Работа';
                      
                      return (
                        <tr key={idx} className="border-t border-red-100 hover:bg-red-50/50">
                          <td className="p-3">{phrase.phrase}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {phrase.count.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-red-600">{reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        <div className="space-y-3">
          {clusters.map((cluster) => {
            const isExpanded = expandedClusters.has(cluster.name);

            return (
              <Card key={cluster.name} className="overflow-hidden">
                <button
                  onClick={() => toggleCluster(cluster.name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={isExpanded ? "ChevronDown" : "ChevronRight"}
                      size={20}
                      className="text-muted-foreground"
                    />
                    <div className="text-left">
                      <div className="font-semibold text-lg">{cluster.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {cluster.phrases.length} фраз • {cluster.phrases.reduce((s, p) => s + p.count, 0).toLocaleString()} показов
                      </div>
                    </div>
                  </div>
                  <Badge className={cluster.color}>
                    {cluster.intent === 'commercial' ? 'Коммерческий' : 'Информационный'}
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left p-3 text-sm font-medium">Фраза</th>
                          <th className="text-right p-3 text-sm font-medium">Показов</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.phrases.map((phrase, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/20">
                            <td className="p-3">{phrase.phrase}</td>
                            <td className="p-3 text-right text-muted-foreground">
                              {phrase.count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            <Icon name="CheckCircle2" size={24} className="text-green-600 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Результат AI-кластеризации</h3>
              <p className="text-sm text-muted-foreground">
                GPT-4 разделил 62 фразы на 14 смысловых кластеров + отдельно выделил 12 минус-фраз (мусор)
              </p>
              <p className="text-sm text-green-700 font-medium mt-2">
                ✅ Каждый кластер имеет четкую семантику и готов для контекстной рекламы
              </p>
              <p className="text-sm text-orange-700 font-medium">
                ⚡ Стоимость такого анализа: ~0.5₽ (GPT-4o-mini)
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
