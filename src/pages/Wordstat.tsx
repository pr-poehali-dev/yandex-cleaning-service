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
}

export default function Wordstat() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WordstatResult[]>([]);
  const [region, setRegion] = useState('213');
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

      if (data.success && data.data?.SearchQuery) {
        setResults(data.data.SearchQuery);
        toast({
          title: 'Успех',
          description: `Найдено ${data.data.SearchQuery.length} запросов`
        });
      } else {
        console.error('Ответ API:', data);
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
                <h3 className="text-lg font-semibold mb-4">Результаты:</h3>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}