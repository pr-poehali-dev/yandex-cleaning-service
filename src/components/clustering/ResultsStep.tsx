import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Phrase {
  phrase: string;
  count: number;
}

interface Cluster {
  name: string;
  intent: string;
  color: string;
  icon: string;
  phrases: Phrase[];
}

interface ResultsStepProps {
  clusters: Cluster[];
  minusWords: string[];
  onExport: () => void;
  onNewProject: () => void;
}

const CLUSTER_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-fuchsia-500',
  'from-orange-500 to-amber-500',
];

export default function ResultsStep({
  clusters,
  minusWords,
  onExport,
  onNewProject
}: ResultsStepProps) {
  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                <Icon name="Layers" className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">{clusters.length}</div>
                <div className="text-sm text-slate-500 font-medium">Кластеров</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                <Icon name="Hash" className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">{totalPhrases}</div>
                <div className="text-sm text-slate-500 font-medium">Ключевых слов</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md">
                <Icon name="Ban" className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">{minusWords.length}</div>
                <div className="text-sm text-slate-500 font-medium">Минус-слов</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {clusters.map((cluster, idx) => {
          const colorClass = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
          return (
            <Card key={idx} className="border-2 border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all">
              <div className={`h-2 bg-gradient-to-r ${colorClass}`} />
              <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-md`}>
                      <Icon name={cluster.icon as any} className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-slate-800">{cluster.name}</CardTitle>
                      <div className="text-sm text-slate-500 mt-1 font-medium">{cluster.phrases.length} запросов</div>
                    </div>
                  </div>
                  <Badge className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-1.5 text-sm font-medium">
                    {cluster.intent === 'commercial' && '💰 Коммерческие'}
                    {cluster.intent === 'informational' && '📚 Информационные'}
                    {cluster.intent === 'navigational' && '🧭 Навигационные'}
                    {cluster.intent === 'transactional' && '📝 Транзакционные'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <div className="space-y-2">
                  {cluster.phrases.map((phrase, pIdx) => (
                    <div 
                      key={pIdx}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                      <span className="text-slate-700 font-medium">{phrase.phrase}</span>
                      <Badge variant="secondary" className="bg-white border-2 border-slate-200 text-slate-600 font-bold">
                        {phrase.count.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {minusWords.length > 0 && (
        <Card className="border-2 border-red-200 shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-500 to-rose-500" />
          <CardHeader className="bg-gradient-to-br from-red-50 to-white border-b">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md">
                <Icon name="X" className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-slate-800">Минус-слова</CardTitle>
                <div className="text-sm text-slate-500 mt-1 font-medium">{minusWords.length} слов для исключения</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 bg-white">
            <div className="flex flex-wrap gap-2">
              {minusWords.map((word, idx) => (
                <Badge 
                  key={idx}
                  variant="secondary"
                  className="bg-red-50 text-red-700 border-2 border-red-200 px-4 py-2 text-sm font-medium"
                >
                  -{word}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={onExport}
            size="lg"
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
          >
            <Icon name="Download" className="mr-2 h-5 w-5" />
            Экспортировать результаты
          </Button>
          <Button 
            onClick={onNewProject}
            size="lg"
            variant="outline"
            className="flex-1 border-2 border-slate-200 hover:bg-slate-50 shadow-lg"
          >
            <Icon name="Plus" className="mr-2 h-5 w-5" />
            Новый проект
          </Button>
        </div>
        
        <Button 
          onClick={onNewProject}
          size="lg"
          variant="ghost"
          className="w-full text-slate-600 hover:text-slate-800 hover:bg-slate-100"
        >
          <Icon name="ArrowLeft" className="mr-2 h-5 w-5" />
          К проектам
        </Button>
      </div>
    </div>
  );
}