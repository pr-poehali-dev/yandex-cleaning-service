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

const CLUSTER_STYLES = [
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-500', border: 'border-blue-200', headerBg: 'bg-blue-50' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-500', border: 'border-emerald-200', headerBg: 'bg-emerald-50' },
  { bg: 'bg-gradient-to-br from-purple-500 to-fuchsia-500', border: 'border-purple-200', headerBg: 'bg-purple-50' },
  { bg: 'bg-gradient-to-br from-orange-500 to-amber-500', border: 'border-orange-200', headerBg: 'bg-orange-50' },
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Icon name="Layers" className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{clusters.length}</div>
                <div className="text-sm text-slate-500">Кластеров</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Icon name="Hash" className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{totalPhrases}</div>
                <div className="text-sm text-slate-500">Ключей</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Icon name="X" className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{minusWords.length}</div>
                <div className="text-sm text-slate-500">Минус-слов</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {clusters.map((cluster, idx) => {
          const style = CLUSTER_STYLES[idx % CLUSTER_STYLES.length];
          return (
            <Card key={idx} className={`border-2 ${style.border} shadow-lg overflow-hidden`}>
              <CardHeader className={`${style.headerBg} border-b`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${style.bg} flex items-center justify-center`}>
                      <Icon name={cluster.icon as any} className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-slate-800">{cluster.name}</CardTitle>
                      <div className="text-sm text-slate-500 mt-1">{cluster.phrases.length} запросов</div>
                    </div>
                  </div>
                  <Badge className="bg-white border-slate-200 text-slate-700">
                    {cluster.intent === 'commercial' && 'Коммерческие'}
                    {cluster.intent === 'informational' && 'Информационные'}
                    {cluster.intent === 'navigational' && 'Навигационные'}
                    {cluster.intent === 'transactional' && 'Транзакционные'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {cluster.phrases.map((phrase, pIdx) => (
                    <div 
                      key={pIdx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <span className="text-slate-700">{phrase.phrase}</span>
                      <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600">
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
        <Card className="border-2 border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                <Icon name="Ban" className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-800">Минус-слова</CardTitle>
                <div className="text-sm text-slate-500 mt-1">{minusWords.length} слов для исключения</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {minusWords.map((word, idx) => (
                <Badge 
                  key={idx}
                  variant="secondary"
                  className="bg-red-50 text-red-700 border border-red-200"
                >
                  -{word}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button 
          onClick={onExport}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Icon name="Download" className="mr-2 h-4 w-4" />
          Экспортировать результаты
        </Button>
        <Button 
          onClick={onNewProject}
          variant="outline"
          className="flex-1 border-slate-200 hover:bg-slate-50"
        >
          <Icon name="Plus" className="mr-2 h-4 w-4" />
          Новый проект
        </Button>
      </div>
    </div>
  );
}
