import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AppSidebar from '@/components/layout/AppSidebar';

interface TopRequest {
  phrase: string;
  count: number;
}

interface Cluster {
  cluster_name: string;
  total_count: number;
  phrases_count: number;
  avg_words: number;
  max_frequency: number;
  min_frequency: number;
  intent: string;
  phrases: TopRequest[];
}

type WorkflowStep = 'input' | 'editing';

export default function WordstatNew() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusPhrases, setMinusPhrases] = useState<TopRequest[]>([]);
  const [region, setRegion] = useState('213');
  const [mode, setMode] = useState<'context' | 'seo'>('context');
  const [step, setStep] = useState<WorkflowStep>('input');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const regions = [
    { id: '225', name: 'Россия' },
    { id: '213', name: 'Москва' },
    { id: '1', name: 'Москва и область' },
    { id: '2', name: 'Санкт-Петербург' },
    { id: '10174', name: 'Санкт-Петербург и область' },
    { id: '65', name: 'Новосибирск' },
    { id: '54', name: 'Екатеринбург' },
    { id: '43', name: 'Казань' },
    { id: '47', name: 'Нижний Новгород' },
    { id: '35', name: 'Краснодар' },
    { id: '36', name: 'Ставрополь' },
    { id: '39', name: 'Ростов-на-Дону' },
    { id: '62', name: 'Владивосток' },
    { id: '63', name: 'Самара' },
    { id: '66', name: 'Омск' },
    { id: '56', name: 'Челябинск' },
    { id: '172', name: 'Уфа' }
  ];

  const toggleCluster = (clusterName: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterName)) {
        next.delete(clusterName);
      } else {
        next.add(clusterName);
      }
      return next;
    });
  };

  const fetchClusters = async () => {
    if (!keywords.trim()) {
      toast({ title: 'Ошибка', description: 'Введите ключевые слова', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/8b141446-430c-4c0b-b347-a0a2057c0ee8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.split('\n').filter(k => k.trim()),
          regions: [parseInt(region)],
          clustering_mode: mode
        })
      });

      if (!response.ok) throw new Error('Ошибка запроса');

      const data = await response.json();
      
      const allClusters = data.clusters || [];
      const minusCluster = allClusters.find((c: Cluster) => c.cluster_name === 'Минус-слова');
      const regularClusters = allClusters.filter((c: Cluster) => c.cluster_name !== 'Минус-слова');

      setClusters(regularClusters);
      setMinusPhrases(minusCluster?.phrases || []);
      setExpandedClusters(new Set(regularClusters.map((c: Cluster) => c.cluster_name)));
      setStep('editing');
      
      toast({ 
        title: 'Готово!', 
        description: `Найдено ${regularClusters.length} кластеров и ${minusCluster?.phrases.length || 0} минус-фраз` 
      });
    } catch (error) {
      toast({ 
        title: 'Ошибка', 
        description: error instanceof Error ? error.message : 'Не удалось получить данные',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePhrase = (clusterName: string, phraseText: string) => {
    setClusters(prev => prev.map(c => {
      if (c.cluster_name === clusterName) {
        const newPhrases = c.phrases.filter(p => p.phrase !== phraseText);
        return {
          ...c,
          phrases: newPhrases,
          phrases_count: newPhrases.length,
          total_count: newPhrases.reduce((sum, p) => sum + p.count, 0),
          max_frequency: newPhrases.length > 0 ? Math.max(...newPhrases.map(p => p.count)) : 0,
          min_frequency: newPhrases.length > 0 ? Math.min(...newPhrases.map(p => p.count)) : 0,
        };
      }
      return c;
    }).filter(c => c.phrases.length > 0));
    toast({ title: 'Удалено', description: phraseText });
  };

  const moveToMinus = (clusterName: string, phrase: TopRequest) => {
    deletePhrase(clusterName, phrase.phrase);
    setMinusPhrases(prev => [...prev, phrase].sort((a, b) => b.count - a.count));
    toast({ title: 'В минус-слова', description: phrase.phrase });
  };

  const removeFromMinus = (phraseText: string) => {
    setMinusPhrases(prev => prev.filter(p => p.phrase !== phraseText));
    toast({ title: 'Удалено', description: phraseText });
  };

  const exportToCSV = () => {
    let csv = 'Кластер,Фраза,Частотность\n';
    clusters.forEach(cluster => {
      cluster.phrases.forEach(phrase => {
        csv += `"${cluster.cluster_name}","${phrase.phrase}",${phrase.count}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Экспорт завершен', description: 'CSV файл загружен' });
  };

  const exportMinusWords = () => {
    const minusText = minusPhrases.map(p => p.phrase).join('\n');
    const blob = new Blob([minusText], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `минус-слова_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast({ title: 'Экспорт завершен', description: `${minusPhrases.length} минус-фраз для Директа` });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);
  const totalShows = clusters.reduce((sum, c) => sum + c.total_count, 0);
  const minusTotalShows = minusPhrases.reduce((sum, p) => sum + p.count, 0);

  const getClusterColor = (clusterName: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-300',
      'bg-green-100 text-green-800 border-green-300',
      'bg-purple-100 text-purple-800 border-purple-300',
      'bg-orange-100 text-orange-800 border-orange-300',
      'bg-yellow-100 text-yellow-800 border-yellow-300',
      'bg-cyan-100 text-cyan-800 border-cyan-300',
      'bg-pink-100 text-pink-800 border-pink-300',
    ];
    const index = clusters.findIndex(c => c.cluster_name === clusterName);
    return colors[index % colors.length];
  };

  if (step === 'input') {
    return (
      <>
        <AppSidebar />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-6 ml-64">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Icon name="Sparkles" size={32} className="text-purple-500" />
              AI-кластеризация Wordstat
            </h1>
            <p className="text-muted-foreground">
              Умная группировка фраз с автоматическим определением минус-слов
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ключевые слова (каждое с новой строки)</label>
              <Textarea
                placeholder="купить квартиру&#10;купить дом&#10;снять квартиру"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={8}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Регион</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Режим</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'context' | 'seo')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="context">Контекстная реклама</option>
                  <option value="seo">SEO-оптимизация</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={fetchClusters} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={20} className="animate-spin mr-2" />
                  Анализирую...
                </>
              ) : (
                <>
                  <Icon name="Sparkles" size={20} className="mr-2" />
                  Кластеризовать с AI
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <Icon name="Info" size={24} className="text-blue-600 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold">Как работает AI-кластеризация?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Понимает смысл фраз, а не только статистику слов</li>
                  <li>✅ Автоматически выделяет минус-слова (мусор, нерелевантные фразы)</li>
                  <li>✅ Разделяет планировки (1-комн, 2-комн, 3-комн) отдельно</li>
                  <li>✅ Группирует конкурентов и агрегаторы в отдельный кластер</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-6 ml-64">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Icon name="Sparkles" size={32} className="text-purple-500" />
              Кластеры готовы
            </h1>
            <p className="text-muted-foreground">
              AI разделил фразы на {clusters.length} кластеров
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Icon name="Download" size={16} className="mr-2" />
              Экспорт CSV
            </Button>
            <Button variant="outline" onClick={() => setStep('input')}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Новый запрос
            </Button>
          </div>
        </div>

        {/* Stats */}
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

        {/* Minus Words Section */}
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
                  Нерелевантные
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
                      <th className="text-center p-3 text-sm font-medium w-20">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minusPhrases.map((phrase, idx) => (
                      <tr key={idx} className="border-t border-red-100 hover:bg-red-50/50">
                        <td className="p-3">{phrase.phrase}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {phrase.count.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromMinus(phrase.phrase)}
                          >
                            <Icon name="Trash2" size={14} className="text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Regular Clusters */}
        <div className="space-y-3">
          {clusters.map((cluster) => {
            const isExpanded = expandedClusters.has(cluster.cluster_name);
            const clusterColor = getClusterColor(cluster.cluster_name);

            return (
              <Card key={cluster.cluster_name} className="overflow-hidden">
                <button
                  onClick={() => toggleCluster(cluster.cluster_name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={isExpanded ? "ChevronDown" : "ChevronRight"}
                      size={20}
                      className="text-muted-foreground"
                    />
                    <div className="text-left">
                      <div className="font-semibold text-lg">{cluster.cluster_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {cluster.phrases.length} фраз • {cluster.total_count.toLocaleString()} показов
                      </div>
                    </div>
                  </div>
                  <Badge className={clusterColor}>
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
                          <th className="text-center p-3 text-sm font-medium w-32">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.phrases.map((phrase, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/20">
                            <td className="p-3">{phrase.phrase}</td>
                            <td className="p-3 text-right text-muted-foreground">
                              {phrase.count.toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveToMinus(cluster.cluster_name, phrase)}
                                  title="В минус-слова"
                                >
                                  <Icon name="Ban" size={14} className="text-orange-500" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deletePhrase(cluster.cluster_name, phrase.phrase)}
                                  title="Удалить"
                                >
                                  <Icon name="Trash2" size={14} className="text-red-500" />
                                </Button>
                              </div>
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
      </div>
    </div>
    </>
  );
}