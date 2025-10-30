import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import type { Cluster } from './ClusteringMockData';

interface ClusteringResultsProps {
  clusters: Cluster[];
  minusWords: string[];
  expandedClusters: Set<string>;
  toggleCluster: (name: string) => void;
  exportMinusWords: () => void;
  exportCluster: (cluster: Cluster) => void;
  onBack: () => void;
}

export default function ClusteringResults({
  clusters,
  minusWords,
  expandedClusters,
  toggleCluster,
  exportMinusWords,
  exportCluster,
  onBack
}: ClusteringResultsProps) {
  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Результаты кластеризации</h1>
          <p className="text-slate-600">Найдено {clusters.length} кластеров и {minusWords.length} минус-слов</p>
        </div>
        <Button onClick={onBack} variant="outline">
          <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
          Назад
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
          <div className="text-3xl font-bold mb-1">{clusters.length}</div>
          <div className="text-sm text-white/90">Кластеров</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <div className="text-3xl font-bold mb-1">{totalPhrases}</div>
          <div className="text-sm text-white/90">Фраз</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white">
          <div className="text-3xl font-bold mb-1">{minusWords.length}</div>
          <div className="text-sm text-white/90">Минус-слов</div>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Кластеры</h2>
        
        {clusters.map((cluster, idx) => {
          const isExpanded = expandedClusters.has(cluster.name);
          
          return (
            <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Icon name={cluster.icon as any} className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900">{cluster.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {cluster.phrases.length} фраз
                        </Badge>
                        <Badge 
                          variant={cluster.intent === 'commercial' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {cluster.intent === 'commercial' ? 'Коммерческий' : 'Информационный'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => exportCluster(cluster)}
                      size="sm"
                      variant="outline"
                    >
                      <Icon name="Download" className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => toggleCluster(cluster.name)}
                      size="sm"
                      variant="ghost"
                    >
                      <Icon 
                        name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                        className="h-4 w-4" 
                      />
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 bg-white">
                  <div className="space-y-2">
                    {cluster.phrases.map((phrase, pidx) => (
                      <div
                        key={pidx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-sm text-slate-700 font-medium">
                          {phrase.phrase}
                        </span>
                        <Badge variant="secondary" className="font-mono">
                          {phrase.count.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-rose-500 to-pink-500 text-white border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Минус-слова</h2>
            <p className="text-sm text-white/90">{minusWords.length} слов</p>
          </div>
          <Button
            onClick={exportMinusWords}
            size="sm"
            variant="secondary"
          >
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>
        
        <div className="p-5 bg-white">
          <div className="flex flex-wrap gap-2">
            {minusWords.map((word, idx) => (
              <Badge key={idx} variant="outline" className="text-sm">
                −{word}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
