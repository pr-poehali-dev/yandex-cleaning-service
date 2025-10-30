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
        {
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

        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Icon name="MapPin" className="h-5 w-5 text-blue-600" />
            <Label htmlFor="address" className="text-slate-700 font-semibold">🤖 Геоключи (опционально)</Label>
          </div>
          <Input
            id="address"
            type="text"
            value={objectAddress}
            onChange={(e) => setObjectAddress(e.target.value)}
            placeholder="Ставрополь, Кулакова 1"
            className="border-blue-200 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
          <p className="text-xs text-slate-600 leading-relaxed">
            <b>AI генерирует вариации адреса:</b><br/>
            "Ставрополь Кулакова 1" → "Кулакова", "Кулакова 1", "Северо-Западный район", "рядом с Тухачевским рынком" и т.д.<br/>
            <span className="text-blue-700 font-medium">Проверяет частотность в Wordstat → добавляет в кластер 📍 Геолокация</span>
          </p>
        </div>
        }

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