import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface WordstatResult {
  Keyword: string;
  Shows: number;
  TopRequests?: Array<{ phrase: string; count: number }>;
  Clusters?: Array<{
    cluster_name: string;
    total_count: number;
    phrases_count: number;
    avg_words: number;
    max_frequency: number;
    min_frequency: number;
    intent: string;
    phrases: Array<{ phrase: string; count: number }>;
  }>;
}

export default function Wordstat() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WordstatResult[]>([]);
  const [region, setRegion] = useState('213');
  const [viewMode, setViewMode] = useState<'table' | 'clusters'>('clusters');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const regions = [
    { id: '213', name: 'Москва' },
    { id: '2', name: 'Санкт-Петербург' },
    { id: '225', name: 'Россия' },
    { id: '11316', name: 'Новосибирск' },
    { id: '54', name: 'Екатеринбург' },
    { id: '63', name: 'Казань' },
    { id: '65', name: 'Нижний Новгород' }
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

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'commercial': return 'bg-green-100 text-green-800 border-green-200';
      case 'informational': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'commercial': return '💰 Коммерческий';
      case 'informational': return 'ℹ️ Информационный';
      default: return '📊 Общий';
    }
  };

  const handleSearch = async () => {
    if (!keywords.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите ключевые слова',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/8b141446-430c-4c0b-b347-a0a2057c0ee8?v=3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keywords: keywords.split('\n').map(k => k.trim()).filter(k => k),
          regions: [parseInt(region)]
        })
      });

      const data = await response.json();

      if (data.success && data.data?.SearchQuery) {
        console.log('Данные ответа:', data);
        console.log('SearchQuery[0]:', data.data.SearchQuery[0]);
        console.log('Clusters:', data.data.SearchQuery[0]?.Clusters);
        setResults(data.data.SearchQuery);
        const totalClusters = data.data.SearchQuery[0]?.Clusters?.length || 0;
        toast({
          title: 'Успех',
          description: `Найдено ${totalClusters} кластеров ключевых слов`
        });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось получить данные',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить запрос',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Search" size={24} />
              Яндекс.Wordstat - Сбор семантики
            </CardTitle>
            <CardDescription>
              Введите ключевые слова (каждое с новой строки) для анализа частотности
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Регион</label>
              <select
                className="w-full p-2 border rounded-md"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ключевые слова</label>
              <textarea
                className="w-full min-h-[200px] p-3 border rounded-md resize-y"
                placeholder="клининг&#10;уборка квартир&#10;мойка окон"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Icon name="Search" size={20} className="mr-2" />
                  Получить данные
                </>
              )}
            </Button>

            {results.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Результаты:</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'clusters' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('clusters')}
                    >
                      <Icon name="Layers" size={16} className="mr-2" />
                      Кластеры
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      <Icon name="Table" size={16} className="mr-2" />
                      Таблица
                    </Button>
                  </div>
                </div>

{viewMode === 'clusters' && results[0]?.Clusters && results[0].Clusters.length > 0 && (
                  <div className="space-y-3">
                    {results[0].Clusters.map((cluster) => (
                      <Card key={cluster.cluster_name} className="overflow-hidden">
                        <button
                          onClick={() => toggleCluster(cluster.cluster_name)}
                          className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Icon 
                                name={expandedClusters.has(cluster.cluster_name) ? "ChevronDown" : "ChevronRight"} 
                                size={20} 
                              />
                              <div>
                                <div className="font-semibold text-lg">{cluster.cluster_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {cluster.phrases_count} фраз · {cluster.total_count.toLocaleString()} показов
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getIntentColor(cluster.intent)}`}>
                                {getIntentLabel(cluster.intent)}
                              </span>
                              <div className="text-right text-sm text-muted-foreground">
                                <div>Макс: {cluster.max_frequency.toLocaleString()}</div>
                                <div>Мин: {cluster.min_frequency.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {expandedClusters.has(cluster.cluster_name) && (
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
                    ))}
                  </div>
                )}

                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-semibold">Ключевое слово</th>
                          <th className="text-right p-3 font-semibold">Частотность</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.flatMap((result, resultIndex) => {
                          if (result.TopRequests && result.TopRequests.length > 0) {
                            return result.TopRequests.map((top, topIndex) => (
                              <tr key={`${resultIndex}-${topIndex}`} className="border-b hover:bg-muted/30">
                                <td className="p-3">{top.phrase}</td>
                                <td className="p-3 text-right text-muted-foreground">
                                  {top.count.toLocaleString()}
                                </td>
                              </tr>
                            ));
                          } else {
                            return (
                              <tr key={resultIndex} className="border-b hover:bg-muted/30">
                                <td className="p-3">{result.Keyword}</td>
                                <td className="p-3 text-right text-muted-foreground">
                                  {result.Shows.toLocaleString()}
                                </td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}