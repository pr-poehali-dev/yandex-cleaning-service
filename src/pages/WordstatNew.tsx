import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';

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

type WorkflowStep = 'input' | 'editing';

export default function WordstatNew() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusWords, setMinusWords] = useState<Record<string, MinusCategory>>({});
  const [region, setRegion] = useState('213');
  const [mode, setMode] = useState<'context' | 'seo'>('seo');
  const [step, setStep] = useState<WorkflowStep>('input');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [editingClusterName, setEditingClusterName] = useState<string | null>(null);
  const [newClusterName, setNewClusterName] = useState('');
  const [showSmartClusterDialog, setShowSmartClusterDialog] = useState(false);
  const [smartClusterKeyword, setSmartClusterKeyword] = useState('');
  const [smartClusterMinShows, setSmartClusterMinShows] = useState(50);
  const [highlightKeyword, setHighlightKeyword] = useState('');
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

  const renameCluster = (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    setClusters(prev => prev.map(c => 
      c.cluster_name === oldName ? { ...c, cluster_name: newName } : c
    ));
    setEditingClusterName(null);
    toast({ title: 'Переименовано', description: `${oldName} → ${newName}` });
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

  const createSmartCluster = () => {
    if (!newClusterName.trim() || !smartClusterKeyword.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    const keyword = smartClusterKeyword.toLowerCase();
    const matchedPhrases: TopRequest[] = [];
    
    setClusters(prev => {
      const updated = prev.map(c => {
        const remaining: TopRequest[] = [];
        const matched: TopRequest[] = [];
        
        c.phrases.forEach(p => {
          if (p.phrase.toLowerCase().includes(keyword) && p.count >= smartClusterMinShows) {
            matched.push(p);
          } else {
            remaining.push(p);
          }
        });
        
        matchedPhrases.push(...matched);
        
        if (remaining.length === 0) return null;
        
        return {
          ...c,
          phrases: remaining,
          phrases_count: remaining.length,
          total_count: remaining.reduce((sum, p) => sum + p.count, 0),
          max_frequency: remaining.length > 0 ? Math.max(...remaining.map(p => p.count)) : 0,
          min_frequency: remaining.length > 0 ? Math.min(...remaining.map(p => p.count)) : 0,
        };
      }).filter(c => c !== null) as Cluster[];
      
      if (matchedPhrases.length > 0) {
        const newCluster: Cluster = {
          cluster_name: newClusterName,
          total_count: matchedPhrases.reduce((sum, p) => sum + p.count, 0),
          phrases_count: matchedPhrases.length,
          avg_words: matchedPhrases.reduce((sum, p) => sum + p.phrase.split(' ').length, 0) / matchedPhrases.length,
          max_frequency: Math.max(...matchedPhrases.map(p => p.count)),
          min_frequency: Math.min(...matchedPhrases.map(p => p.count)),
          intent: 'general',
          phrases: matchedPhrases.sort((a, b) => b.count - a.count)
        };
        updated.push(newCluster);
        setExpandedClusters(prev => new Set([...prev, newClusterName]));
      }
      
      return updated;
    });
    
    setShowSmartClusterDialog(false);
    setNewClusterName('');
    setSmartClusterKeyword('');
    setSmartClusterMinShows(50);
    
    toast({ 
      title: 'Кластер создан', 
      description: `Найдено ${matchedPhrases.length} фраз с "${smartClusterKeyword}"` 
    });
  };

  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === keyword.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 font-semibold">{part}</span> : 
        part
    );
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
    link.download = `wordstat_${mode}_${Date.now()}.csv`;
    link.click();
    
    toast({ title: 'Экспорт завершен', description: 'CSV файл загружен' });
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
          regions: [parseInt(region)],
          mode: mode
        })
      });

      const data = await response.json();

      if (data.success && data.data?.SearchQuery) {
        const clusterData = data.data.SearchQuery[0]?.Clusters || [];
        const minusData = data.data.SearchQuery[0]?.MinusWords || {};
        setClusters(clusterData);
        setMinusWords(minusData);
        setExpandedClusters(new Set(clusterData.map((c: Cluster) => c.cluster_name)));
        
        toast({
          title: 'Успех! ✅',
          description: `Найдено ${clusterData.length} кластеров. Теперь можно редактировать!`
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'input' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'input' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
              {step === 'input' ? '1' : '✓'}
            </div>
            <span>Сбор данных</span>
          </div>
          <Icon name="ChevronRight" size={20} className="text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'editing' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'editing' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</div>
            <span>Редактирование</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Search" size={24} />
              {step === 'input' ? 'Шаг 1: Сбор семантики' : 'Шаг 2: Редактирование кластеров'}
            </CardTitle>
            <CardDescription>
              {step === 'input' ? 'Введите ключевое слово для анализа' : 'Переименовывайте кластеры и удаляйте ненужные фразы'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'input' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Для чего собираем?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode('seo')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        mode === 'seo' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📝</div>
                      <div className="font-semibold">SEO</div>
                      <div className="text-xs text-muted-foreground mt-1">Широкие кластеры</div>
                    </button>
                    <button
                      onClick={() => setMode('context')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        mode === 'context' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">💰</div>
                      <div className="font-semibold">Контекст</div>
                      <div className="text-xs text-muted-foreground mt-1">Узкие группы</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Регион</label>
                  <select className="w-full p-2 border rounded-md" value={region} onChange={(e) => setRegion(e.target.value)}>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
                      Собрать семантику
                    </>
                  )}
                </Button>

                {clusters.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-green-800">✅ Данные собраны!</div>
                        <div className="text-sm text-green-600">Найдено {clusters.length} кластеров с {clusters.reduce((sum, c) => sum + c.phrases_count, 0)} фразами</div>
                      </div>
                      <Button onClick={() => setStep('editing')} className="bg-green-600 hover:bg-green-700">
                        Перейти к редактированию →
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button onClick={() => setStep('input')} variant="outline">
                    <Icon name="ArrowLeft" size={16} className="mr-2" />
                    Назад
                  </Button>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowSmartClusterDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Icon name="Sparkles" size={16} className="mr-2" />
                      Умный кластер
                    </Button>
                    <Button onClick={exportToCSV} variant="outline">
                      <Icon name="Download" size={16} className="mr-2" />
                      Экспорт CSV
                    </Button>
                  </div>
                </div>

                {showSmartClusterDialog && (
                  <Card className="mb-4 border-purple-300 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-lg">✨ Создать умный кластер</CardTitle>
                      <CardDescription>
                        Система автоматически найдет и сгруппирует подходящие фразы
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Название кластера</label>
                        <Input
                          placeholder="Квартиры у шоссе"
                          value={newClusterName}
                          onChange={(e) => setNewClusterName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Ключевое слово для поиска</label>
                        <Input
                          placeholder="шоссе"
                          value={smartClusterKeyword}
                          onChange={(e) => {
                            setSmartClusterKeyword(e.target.value);
                            setHighlightKeyword(e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Минимум показов</label>
                        <Input
                          type="number"
                          value={smartClusterMinShows}
                          onChange={(e) => setSmartClusterMinShows(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={createSmartCluster} className="flex-1">
                          Создать кластер
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowSmartClusterDialog(false);
                            setHighlightKeyword('');
                          }} 
                          variant="outline"
                        >
                          Отмена
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
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
                              {editingClusterName === cluster.cluster_name ? (
                                <Input
                                  defaultValue={cluster.cluster_name}
                                  onBlur={(e) => renameCluster(cluster.cluster_name, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      renameCluster(cluster.cluster_name, e.currentTarget.value);
                                    }
                                  }}
                                  className="font-semibold text-lg"
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                <div className="font-semibold text-lg">{cluster.cluster_name}</div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                {cluster.phrases_count} фраз · {cluster.total_count.toLocaleString()} показов
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingClusterName(cluster.cluster_name);
                              }}
                            >
                              <Icon name="Edit2" size={16} />
                            </Button>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getIntentColor(cluster.intent)}`}>
                              {getIntentLabel(cluster.intent)}
                            </span>
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
                                <th className="text-center p-3 text-sm font-medium w-20">Действия</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cluster.phrases.map((phrase, idx) => (
                                <tr key={idx} className="border-t hover:bg-muted/20">
                                  <td className="p-3">
                                    {highlightKeyword ? highlightText(phrase.phrase, highlightKeyword) : phrase.phrase}
                                  </td>
                                  <td className="p-3 text-right text-muted-foreground">
                                    {phrase.count.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deletePhrase(cluster.cluster_name, phrase.phrase)}
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
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}