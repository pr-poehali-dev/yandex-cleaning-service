import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface Filter {
  id: string;
  pattern: string;
}

const DEFAULT_FILTERS: Filter[] = [
  { id: '1', pattern: 'com.' },
  { id: '2', pattern: 'dsp' },
  { id: '3', pattern: 'vnp' }
];

export default function RSYACleaner() {
  const [filters, setFilters] = useState<Filter[]>(DEFAULT_FILTERS);
  const [newFilter, setNewFilter] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ disabled: number; total: number } | null>(null);
  const { toast } = useToast();

  const addFilter = () => {
    if (!newFilter.trim()) {
      toast({ title: 'Введите паттерн фильтра', variant: 'destructive' });
      return;
    }

    const filter: Filter = {
      id: Date.now().toString(),
      pattern: newFilter.trim()
    };

    setFilters([...filters, filter]);
    setNewFilter('');
    toast({ title: '✅ Фильтр добавлен', description: `Паттерн: ${filter.pattern}` });
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
    toast({ title: 'Фильтр удалён' });
  };

  const handleClean = async () => {
    if (!apiToken.trim()) {
      toast({ title: 'Введите токен Яндекс.Директ API', variant: 'destructive' });
      return;
    }

    if (!campaignId.trim()) {
      toast({ title: 'Введите ID кампании РСЯ', variant: 'destructive' });
      return;
    }

    if (filters.length === 0) {
      toast({ title: 'Добавьте хотя бы один фильтр', variant: 'destructive' });
      return;
    }

    setLoading(true);
    toast({ 
      title: '🚀 Запуск чистки...', 
      description: `Применяем ${filters.length} фильтров к кампании ${campaignId}` 
    });

    setTimeout(() => {
      setLoading(false);
      const mockResults = { disabled: 247, total: 1520 };
      setResults(mockResults);
      toast({ 
        title: '✅ Чистка завершена!', 
        description: `Отключено ${mockResults.disabled} площадок из ${mockResults.total}` 
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-sky-50/30 to-cyan-50/50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Чистка площадок РСЯ
          </h1>
          <p className="text-slate-600">
            Автоматическое отключение нежелательных площадок в кампаниях РСЯ
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Key" size={20} />
                API подключение
              </CardTitle>
              <CardDescription>
                Введите данные для подключения к Яндекс.Директ API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiToken">Токен Яндекс.Директ API</Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder="y0_AgAAAAAA..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Получить токен можно в настройках Яндекс.Директ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignId">ID кампании РСЯ</Label>
                <Input
                  id="campaignId"
                  type="text"
                  placeholder="12345678"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Filter" size={20} />
                Фильтры площадок
              </CardTitle>
              <CardDescription>
                Площадки, содержащие эти паттерны, будут отключены
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 border rounded-lg bg-slate-50">
                {filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Фильтры не добавлены</p>
                ) : (
                  filters.map(filter => (
                    <Badge 
                      key={filter.id} 
                      className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 border-blue-200"
                    >
                      <span className="font-mono">{filter.pattern}</span>
                      <Icon 
                        name="X" 
                        size={14} 
                        className="ml-2 cursor-pointer hover:text-blue-900" 
                        onClick={() => removeFilter(filter.id)}
                      />
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Введите паттерн (например: com., dsp, vnp)"
                  value={newFilter}
                  onChange={(e) => setNewFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFilter()}
                />
                <Button onClick={addFilter} variant="outline">
                  <Icon name="Plus" size={18} className="mr-2" />
                  Добавить
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  📌 Примеры фильтров:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <code className="font-mono bg-white px-1 rounded">com.</code> — блокирует домены типа example.com.ru</li>
                  <li>• <code className="font-mono bg-white px-1 rounded">dsp</code> — блокирует DSP-площадки</li>
                  <li>• <code className="font-mono bg-white px-1 rounded">vnp</code> — блокирует VNP-партнёрки</li>
                  <li>• <code className="font-mono bg-white px-1 rounded">adult</code> — блокирует взрослый контент</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Icon name="CheckCircle2" size={20} />
                  Результаты чистки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{results.disabled}</div>
                    <div className="text-sm text-muted-foreground">Площадок отключено</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-3xl font-bold text-slate-600">{results.total}</div>
                    <div className="text-sm text-muted-foreground">Всего проверено</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-green-700 text-center">
                  ✨ Отключено {((results.disabled / results.total) * 100).toFixed(1)}% площадок
                </p>
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={handleClean} 
            disabled={loading}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                Выполняется чистка...
              </>
            ) : (
              <>
                <Icon name="Sparkles" size={20} className="mr-2" />
                Запустить чистку площадок
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
