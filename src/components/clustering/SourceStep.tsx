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
  onNext: () => void;
}

export default function SourceStep({
  source,
  setSource,
  manualKeywords,
  setManualKeywords,
  websiteUrl,
  setWebsiteUrl,
  onNext
}: SourceStepProps) {
  const handleNext = () => {
    if (source === 'manual' && !manualKeywords.trim()) {
      return;
    }
    if (source === 'website' && !websiteUrl.trim()) {
      return;
    }
    onNext();
  };

  const isNextDisabled = source === 'manual' 
    ? !manualKeywords.trim() 
    : !websiteUrl.trim();

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-br from-slate-50 to-white">
        <CardTitle className="text-2xl text-slate-800">Откуда возьмем ключи?</CardTitle>
        <CardDescription className="text-slate-500">
          Выберите, как вы хотите предоставить ключевые слова для кластеризации
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setSource('manual')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              source === 'manual'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                source === 'manual' ? 'bg-emerald-500' : 'bg-slate-100'
              }`}>
                <Icon 
                  name="FileText" 
                  className={`h-5 w-5 ${source === 'manual' ? 'text-white' : 'text-slate-600'}`}
                />
              </div>
              <div>
                <div className="font-semibold text-slate-800">Вручную</div>
                <div className="text-sm text-slate-500">Вставить список</div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setSource('website')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              source === 'website'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                source === 'website' ? 'bg-emerald-500' : 'bg-slate-100'
              }`}>
                <Icon 
                  name="Globe" 
                  className={`h-5 w-5 ${source === 'website' ? 'text-white' : 'text-slate-600'}`}
                />
              </div>
              <div>
                <div className="font-semibold text-slate-800">С сайта</div>
                <div className="text-sm text-slate-500">Парсинг URL</div>
              </div>
            </div>
          </div>
        </div>

        {source === 'manual' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="keywords" className="text-slate-700">Список ключевых слов</Label>
            <textarea
              id="keywords"
              value={manualKeywords}
              onChange={(e) => setManualKeywords(e.target.value)}
              placeholder="Введите ключевые слова (каждое с новой строки)&#10;купить квартиру москва&#10;купить квартиру от застройщика&#10;купить квартиру вторичка"
              className="w-full h-48 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
            <p className="text-xs text-slate-500">
              {manualKeywords.split('\n').filter(k => k.trim()).length} ключевых слов
            </p>
          </div>
        )}

        {source === 'website' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="website" className="text-slate-700">URL сайта</Label>
            <Input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500">
              Мы соберем все ключевые слова, по которым ранжируется ваш сайт
            </p>
          </div>
        )}

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
