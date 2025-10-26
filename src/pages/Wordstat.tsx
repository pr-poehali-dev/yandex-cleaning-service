import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface WordstatResult {
  Keyword: string;
  Shows: number;
}

export default function Wordstat() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WordstatResult[]>([]);
  const { toast } = useToast();

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
          regions: [213]
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
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <span className="font-medium">{result.Keyword}</span>
                        <span className="text-muted-foreground">
                          {result.Shows.toLocaleString()} показов/месяц
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
