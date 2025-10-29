import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

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

interface MinusCategory {
  name: string;
  count: number;
  total_volume: number;
  phrases: TopRequest[];
}

export default function WordstatNew() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusWords, setMinusWords] = useState<Record<string, MinusCategory>>({});
  const [region, setRegion] = useState('213');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [expandedMinusCategories, setExpandedMinusCategories] = useState<Set<string>>(new Set());
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

  const toggleMinusCategory = (categoryKey: string) => {
    setExpandedMinusCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
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
    setClusters([]);
    setMinusWords({});
    
    try {
      const response = await fetch('https://functions.poehali.dev/8b141446-430c-4c0b-b347-a0a2057c0ee8', {
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
      console.log('API Response:', data);

      if (data.success && data.data?.SearchQuery) {
        const clusterData = data.data.SearchQuery[0]?.Clusters || [];
        const minusData = data.data.SearchQuery[0]?.MinusWords || {};
        console.log('Clusters:', clusterData);
        console.log('Minus words:', minusData);
        setClusters(clusterData);
        setMinusWords(minusData);
        
        toast({
          title: 'Успех! ✅',
          description: `Найдено ${clusterData.length} кластеров`
        });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось получить данные',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Ошибка:', error);
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
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Search" size={24} />
              Яндекс.Wordstat - Умная кластеризация
            </CardTitle>
            <CardDescription>
              Введите ключевое слово для анализа и автоматической кластеризации
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
              <label className="block text-sm font-medium mb-2">Ключевое слово</label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md resize-y"
                placeholder="купить квартиру"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Анализирую...
                </>
              ) : (
                <>
                  <Icon name="Search" size={20} className="mr-2" />
                  Анализировать
                </>
              )}
            </Button>

            {clusters.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold">
                  🎯 Найдено {clusters.length} кластеров
                </h3>
                {clusters.map((cluster) => (
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

            {Object.keys(minusWords).length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Icon name="ShieldAlert" size={24} />
                  ⛔ Минус-слова ({Object.values(minusWords).reduce((sum, cat) => sum + cat.count, 0)} нецелевых фраз)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Рекомендуется добавить эти слова в минус-фразы рекламных кампаний для экономии бюджета
                </p>
                {Object.entries(minusWords).map(([key, category]) => (
                  <Card key={key} className="overflow-hidden border-red-200">
                    <button
                      onClick={() => toggleMinusCategory(key)}
                      className="w-full text-left p-4 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon 
                            name={expandedMinusCategories.has(key) ? "ChevronDown" : "ChevronRight"} 
                            size={20} 
                          />
                          <div>
                            <div className="font-semibold text-lg">{category.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {category.count} фраз · {category.total_volume.toLocaleString()} показов
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-red-600 font-medium">
                          Нецелевые
                        </div>
                      </div>
                    </button>
                    
                    {expandedMinusCategories.has(key) && (
                      <div className="border-t border-red-200">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-red-50">
                              <th className="text-left p-3 text-sm font-medium">Фраза</th>
                              <th className="text-right p-3 text-sm font-medium">Показов</th>
                            </tr>
                          </thead>
                          <tbody>
                            {category.phrases.map((phrase, idx) => (
                              <tr key={idx} className="border-t hover:bg-red-50/50">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}