import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import AppSidebar from '@/components/layout/AppSidebar';
import ExcelClustersTable from '@/components/wordstat/ExcelClustersTable';

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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Icon name="Table" size={32} className="text-emerald-500" />
              Excel-редактор кластеров
            </h1>
            <p className="text-muted-foreground">
              Перетаскивайте фразы между кластерами, начиная вводить текст
            </p>
          </div>
          <Button variant="outline" onClick={() => setStep('input')}>
            <Icon name="RefreshCw" size={16} className="mr-2" />
            Новый запрос
          </Button>
        </div>

        <ExcelClustersTable 
          initialClusters={clusters}
          initialMinusPhrases={minusPhrases}
        />
      </div>
    </div>
    </>
  );
}