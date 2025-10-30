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
  onWordstatClick?: () => void;
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
  onNext,
  onWordstatClick
}: SourceStepProps) {
  const handleNext = () => {
    onNext();
  };

  const isNextDisabled = false;

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-br from-slate-50 to-white">
        <CardTitle className="text-2xl text-slate-800">AI сбор ключей</CardTitle>
        <CardDescription className="text-slate-500">
          Укажите токен Яндекс Вордстат и введите ключевые слова
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
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

        <div className="flex gap-3">
          {onWordstatClick && (
            <Button 
              onClick={onWordstatClick}
              variant="outline"
              className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            >
              <Icon name="Sparkles" className="mr-2 h-4 w-4" />
              Собрать из Wordstat
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={isNextDisabled}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Далее
            <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}