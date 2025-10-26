import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface WordstatResult {
  Keyword: string;
  Shows: number;
}

export default function Index() {
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
      const keywordList = keywords.split('\n').map(k => k.trim()).filter(k => k);
      console.log('Отправляем запрос с ключевыми словами:', keywordList);
      
      const response = await fetch('https://functions.poehali.dev/8b141446-430c-4c0b-b347-a0a2057c0ee8', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keywords: keywordList,
          regions: [213]
        })
      });

      console.log('Статус ответа:', response.status);
      const data = await response.json();
      console.log('Данные ответа:', data);

      if (data.success && data.data?.SearchQuery) {
        setResults(data.data.SearchQuery);
        toast({
          title: 'Успех',
          description: `Найдено ${data.data.SearchQuery.length} запросов`
        });
      } else {
        toast({
          title: 'Ошибка API',
          description: data.error || JSON.stringify(data),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Ошибка запроса:', error);
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
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Icon name="Search" size={28} />
              Яндекс.Wordstat - Сбор семантики
            </CardTitle>
            <CardDescription>
              Введите ключевые слова (каждое с новой строки) для анализа частотности
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <textarea
                className="w-full min-h-[200px] p-3 border rounded-md resize-y font-mono"
                placeholder="клининг&#10;уборка квартир&#10;мойка окон"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <Button onClick={handleSearch} disabled={loading} className="w-full" size="lg">
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
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex justify-between items-center">
                        <span className="font-medium">{result.Keyword}</span>
                        <span className="text-muted-foreground bg-blue-50 px-3 py-1 rounded-full">
                          {result.Shows.toLocaleString()} показов/мес
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
