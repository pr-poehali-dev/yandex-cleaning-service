import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

type Source = 'manual' | 'website';

interface SourceStepProps {
  source: Source;
  setSource: (source: Source) => void;
  manualKeywords: string;
  setManualKeywords: (keywords: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  objectAddress: string;
  setObjectAddress: (address: string) => void;
  clientId: string;
  setClientId: (id: string) => void;
  clientSecret: string;
  setClientSecret: (secret: string) => void;
  onNext: () => void;
}

export default function SourceStep({
  source,
  setSource,
  manualKeywords,
  setManualKeywords,
  websiteUrl,
  setWebsiteUrl,
  objectAddress,
  setObjectAddress,
  clientId,
  setClientId,
  clientSecret,
  setClientSecret,
  onNext
}: SourceStepProps) {
  const handleNext = () => {
    onNext();
  };

  const isNextDisabled = false;

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-br from-slate-50 to-white">
        <CardTitle className="text-2xl text-slate-800">Откуда возьмем ключи?</CardTitle>
        <CardDescription className="text-slate-500">
          Выберите, как вы хотите предоставить ключевые слова для кластеризации
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Icon name="Key" className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900 mb-1">Настройки Яндекс.Директ API</h3>
              <p className="text-sm text-amber-700 mb-3">Получите Client ID и Secret на <a href="https://oauth.yandex.ru" target="_blank" rel="noopener noreferrer" className="underline">oauth.yandex.ru</a></p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client-id" className="text-slate-700">Client ID</Label>
            <Input
              id="client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="4f93051bafae4b50a1928d1121b71379"
              className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client-secret" className="text-slate-700">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Введите Client Secret"
              className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="keywords" className="text-slate-700">Список ключевых слов</Label>
          <textarea
            id="keywords"
            value={manualKeywords}
            onChange={(e) => setManualKeywords(e.target.value)}
            placeholder="Введите ключевые слова (каждое с новой строки)&#10;купить квартиру москва&#10;купить квартиру от застройщика&#10;купить квартиру вторичка&#10;&#10;Или оставьте пустым и соберите из Wordstat на следующем шаге"
            className="w-full h-48 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
          <p className="text-xs text-slate-500">
            {manualKeywords.split('\n').filter(k => k.trim()).length} ключевых слов
          </p>
        </div>

        <Button 
          onClick={handleNext}
          disabled={isNextDisabled}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          Далее
          <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}