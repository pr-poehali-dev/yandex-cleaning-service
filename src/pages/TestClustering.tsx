import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

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

const mockPhrases: Phrase[] = [
  { phrase: 'купить квартиру', count: 125000 },
  { phrase: 'купить квартиру в москве', count: 45000 },
  { phrase: 'купить квартиру вторичку', count: 12000 },
  { phrase: 'купить квартиру от застройщика', count: 8500 },
  { phrase: 'купить квартиру новостройка', count: 15000 },
  { phrase: 'купить квартиру в новостройке москва', count: 6200 },
  { phrase: 'купить квартиру вторичный рынок', count: 3800 },
  { phrase: 'купить квартиру вторичное жилье', count: 2900 },
  { phrase: 'купить квартиру в подмосковье', count: 8900 },
  { phrase: 'купить квартиру московская область', count: 5600 },
  { phrase: 'купить квартиру недорого', count: 18000 },
  { phrase: 'купить квартиру недорого москва', count: 7200 },
  { phrase: 'купить квартиру цена', count: 22000 },
  { phrase: 'купить квартиру стоимость', count: 9800 },
  { phrase: 'купить квартиру без посредников', count: 14000 },
  { phrase: 'купить квартиру от собственника', count: 11000 },
  { phrase: 'купить квартиру авито', count: 19000 },
  { phrase: 'купить квартиру циан', count: 16500 },
  { phrase: 'купить квартиру домклик', count: 8200 },
  { phrase: 'купить однокомнатную квартиру', count: 32000 },
  { phrase: 'купить двухкомнатную квартиру', count: 28000 },
  { phrase: 'купить трехкомнатную квартиру', count: 15000 },
  { phrase: 'купить студию', count: 12000 },
  { phrase: 'купить квартиру студию', count: 9500 },
  { phrase: 'купить квартиру 1 комнатную', count: 25000 },
  { phrase: 'купить квартиру 2 комнатную', count: 21000 },
  { phrase: 'купить квартиру в ипотеку', count: 35000 },
  { phrase: 'купить квартиру ипотека', count: 28000 },
  { phrase: 'купить квартиру материнский капитал', count: 8900 },
  { phrase: 'купить квартиру в кредит', count: 12000 },
  { phrase: 'купить квартиру рядом с метро', count: 8500 },
  { phrase: 'купить квартиру у метро', count: 6200 },
  { phrase: 'купить квартиру центр москвы', count: 9800 },
  { phrase: 'купить квартиру в центре', count: 14000 },
  { phrase: 'купить квартиру юао', count: 4200 },
  { phrase: 'купить квартиру сао', count: 3800 },
  { phrase: 'купить квартиру свао', count: 4100 },
  { phrase: 'купить квартиру с ремонтом', count: 16000 },
  { phrase: 'купить квартиру без ремонта', count: 7800 },
  { phrase: 'купить квартиру под ремонт', count: 5200 },
  { phrase: 'купить квартиру с мебелью', count: 6500 },
  { phrase: 'купить квартиру срочно', count: 9200 },
  { phrase: 'купить квартиру срочная продажа', count: 4800 },
  { phrase: 'купить квартиру у застройщика', count: 11000 },
  { phrase: 'купить квартиру пик', count: 8900 },
  { phrase: 'купить квартиру самолет', count: 7200 },
  { phrase: 'купить квартиру лср', count: 5600 },
  { phrase: 'купить квартиру на первичном рынке', count: 6800 },
  { phrase: 'купить квартиру первичка', count: 4200 },
  { phrase: 'купить квартиру эталон', count: 4500 }
];

const aiClusters: Cluster[] = [
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
    name: 'Агрегаторы (конкуренты)',
    intent: 'informational',
    color: 'bg-red-100 text-red-800 border-red-300',
    phrases: [
      { phrase: 'купить квартиру авито', count: 19000 },
      { phrase: 'купить квартиру циан', count: 16500 },
      { phrase: 'купить квартиру домклик', count: 8200 }
    ]
  },
  {
    name: 'География: Москва',
    intent: 'commercial',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
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
    color: 'bg-purple-100 text-purple-800 border-purple-300',
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
    name: 'Планировка: 2-3 комнатные',
    intent: 'commercial',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    phrases: [
      { phrase: 'купить двухкомнатную квартиру', count: 28000 },
      { phrase: 'купить квартиру 2 комнатную', count: 21000 },
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
    name: 'Расположение: Метро и центр',
    intent: 'commercial',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    phrases: [
      { phrase: 'купить квартиру рядом с метро', count: 8500 },
      { phrase: 'купить квартиру у метро', count: 6200 }
    ]
  },
  {
    name: 'Состояние: Ремонт',
    intent: 'commercial',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
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
    color: 'bg-red-100 text-red-800 border-red-300',
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
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(aiClusters.map(c => c.name))
  );

  const toggleCluster = (name: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedClusters(newExpanded);
  };

  const totalPhrases = aiClusters.reduce((sum, c) => sum + c.phrases.length, 0);
  const totalShows = mockPhrases.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Icon name="Sparkles" size={32} className="text-purple-500" />
            Демо: AI-кластеризация с OpenAI
          </h1>
          <p className="text-muted-foreground">
            Визуализация того, как GPT-4 кластеризовал бы запрос "купить квартиру" (первые 50 фраз из Wordstat)
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Всего фраз</div>
            <div className="text-2xl font-bold">{totalPhrases}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Кластеров</div>
            <div className="text-2xl font-bold">{aiClusters.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Показов в месяц</div>
            <div className="text-2xl font-bold">{totalShows.toLocaleString()}</div>
          </Card>
        </div>

        {/* Algorithm Comparison */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <Icon name="Info" size={24} className="text-blue-600 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Чем OpenAI лучше TF-IDF?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-red-600">❌ TF-IDF (текущий):</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                    <li>"купить квартиру в москве" → кластер "Вторичка" (ошибка!)</li>
                    <li>Не понимает смысл, только статистику слов</li>
                    <li>"Авито", "Циан" смешиваются с обычными фразами</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-green-600">✅ OpenAI GPT-4:</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                    <li>"купить квартиру в москве" → кластер "География: Москва"</li>
                    <li>Понимает смысл и контекст фразы</li>
                    <li>"Авито", "Циан" → отдельный кластер "Конкуренты"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Clusters */}
        <div className="space-y-3">
          {aiClusters.map((cluster) => {
            const isExpanded = expandedClusters.has(cluster.name);
            const totalShows = cluster.phrases.reduce((sum, p) => sum + p.count, 0);

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
                        {cluster.phrases.length} фраз • {totalShows.toLocaleString()} показов
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

        {/* Footer */}
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            <Icon name="CheckCircle2" size={24} className="text-green-600 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Результат AI-кластеризации</h3>
              <p className="text-sm text-muted-foreground">
                GPT-4 разделил 50 фраз на 13 смысловых кластеров:
                <span className="font-medium"> Вторичка, Новостройки, География, Планировки, Финансирование, Состояние, Срочность</span>
              </p>
              <p className="text-sm text-green-700 font-medium mt-2">
                ✅ Каждый кластер имеет четкую семантику и готов для контекстной рекламы
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
