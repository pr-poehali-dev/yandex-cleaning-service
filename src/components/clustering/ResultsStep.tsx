import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

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
  projectId?: number;
  onSaveChanges?: (clusters: Cluster[], minusWords: Phrase[]) => void;
}

const CLUSTER_BG_COLORS = [
  '#E8F4F8',
  '#F5E8F8', 
  '#E8F8E8',
  '#FFF8E0',
  '#FCE8F0',
  '#E0F8F5',
  '#F9FBE7',
  '#E1F5FE',
];

export default function ResultsStep({
  clusters: initialClusters,
  minusWords: initialMinusWords,
  onExport,
  onNewProject,
  projectId,
  onSaveChanges
}: ResultsStepProps) {
  const [clusters, setClusters] = useState(
    initialClusters.map((c, idx) => ({
      ...c,
      bgColor: CLUSTER_BG_COLORS[idx % CLUSTER_BG_COLORS.length],
      searchText: ''
    }))
  );
  const [minusWords, setMinusWords] = useState<Phrase[]>(
    initialMinusWords.map(word => ({ phrase: word, count: 0 }))
  );
  const { toast } = useToast();

  const matchesSearch = (phrase: string, searchTerm: string): boolean => {
    if (!searchTerm.trim()) return false;
    return phrase.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const handleSearchChange = (clusterIndex: number, value: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].searchText = value;
    setClusters(newClusters);
  };

  const handleConfirmSearch = (targetIndex: number) => {
    const newClusters = [...clusters];
    const targetCluster = newClusters[targetIndex];
    const searchTerm = targetCluster.searchText.toLowerCase();

    if (!searchTerm) return;

    const movedPhrases: Phrase[] = [];

    for (let i = 0; i < newClusters.length; i++) {
      if (i === targetIndex) continue;

      const cluster = newClusters[i];
      const matchingPhrases = cluster.phrases.filter(p =>
        p.phrase.toLowerCase().includes(searchTerm)
      );

      if (matchingPhrases.length > 0) {
        cluster.phrases = cluster.phrases.filter(p =>
          !p.phrase.toLowerCase().includes(searchTerm)
        );
        movedPhrases.push(...matchingPhrases);
      }
    }

    if (movedPhrases.length > 0) {
      targetCluster.phrases = [...targetCluster.phrases, ...movedPhrases]
        .sort((a, b) => b.count - a.count);
      targetCluster.searchText = '';

      toast({
        title: '✅ Перенесено',
        description: `${movedPhrases.length} фраз`
      });
    }

    setClusters(newClusters);
  };

  const copyClusterPhrases = (phrases: Phrase[]) => {
    const text = phrases.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${phrases.length} фраз` });
  };

  const exportToCSV = () => {
    let csv = 'Кластер,Фраза,Частотность\n';

    clusters.forEach(cluster => {
      cluster.phrases.forEach(phrase => {
        csv += `"${cluster.name}","${phrase.phrase}",${phrase.count}\n`;
      });
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: '📊 Экспорт завершен' });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-shrink-0 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Результаты кластеризации</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalPhrases} фраз • Введите текст в поле кластера для автопереноса
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
              <Icon name="Download" size={16} />
              Excel
            </Button>
            <Button onClick={onExport} size="sm" variant="outline" className="gap-2">
              <Icon name="FileText" size={16} />
              Экспорт
            </Button>
            <Button onClick={onNewProject} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Icon name="ArrowLeft" size={16} />
              К проектам
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full">
          {clusters.map((cluster, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 border-r border-gray-300 flex flex-col"
              style={{ 
                width: '280px',
                backgroundColor: cluster.bgColor
              }}
            >
              <div className="p-3 border-b border-gray-200 bg-white/60">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={cluster.icon as any} size={18} className="text-gray-700" />
                  <span className="font-semibold text-sm text-gray-800 flex-1">
                    {cluster.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {cluster.phrases.length}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <Input
                    placeholder="🔍 Поиск..."
                    value={cluster.searchText}
                    onChange={(e) => handleSearchChange(idx, e.target.value)}
                    className="h-8 text-sm bg-white border-gray-300"
                  />
                  {cluster.searchText && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmSearch(idx)}
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                    >
                      <Icon name="Plus" size={14} />
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyClusterPhrases(cluster.phrases)}
                  className="w-full mt-2 text-xs h-7 hover:bg-white/80"
                >
                  <Icon name="Copy" size={12} className="mr-1.5" />
                  Копировать {cluster.phrases.length} фраз
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {cluster.phrases.map((phrase, pIdx) => {
                  const isHighlighted = matchesSearch(phrase.phrase, cluster.searchText);
                  
                  return (
                    <div
                      key={pIdx}
                      className="px-3 py-2 border-b border-gray-200 hover:bg-white/40"
                      style={isHighlighted ? {
                        backgroundColor: '#FFF59D',
                        fontWeight: 600
                      } : {}}
                    >
                      <div className="text-sm text-gray-800 leading-snug mb-1">
                        {phrase.phrase}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {phrase.count.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
