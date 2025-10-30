import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Phrase {
  phrase: string;
  count: number;
}

interface Cluster {
  cluster_name: string;
  phrases: Phrase[];
  color: string;
  searchText: string;
}

interface ExcelClustersTableProps {
  initialClusters: any[];
  initialMinusPhrases: Phrase[];
}

const CLUSTER_COLORS = [
  '#E3F2FD',
  '#F3E5F5', 
  '#E8F5E9',
  '#FFF3E0',
  '#FCE4EC',
  '#E0F2F1',
  '#F9FBE7',
  '#E1F5FE',
];

export default function ExcelClustersTable({ 
  initialClusters, 
  initialMinusPhrases 
}: ExcelClustersTableProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusPhrases, setMinusPhrases] = useState<Phrase[]>(initialMinusPhrases);
  const [minusSearchText, setMinusSearchText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setClusters(initialClusters.map((c, idx) => ({
      ...c,
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      searchText: ''
    })));
  }, [initialClusters]);

  const handleSearchChange = (clusterIndex: number, value: string) => {
    const newClusters = [...clusters];
    const targetCluster = newClusters[clusterIndex];
    targetCluster.searchText = value;

    if (!value.trim()) {
      setClusters(newClusters);
      return;
    }

    const searchLower = value.toLowerCase();
    const movedPhrases: Phrase[] = [];

    for (let i = 0; i < newClusters.length; i++) {
      if (i === clusterIndex) continue;

      const cluster = newClusters[i];
      const matchingPhrases = cluster.phrases.filter(p => 
        p.phrase.toLowerCase().includes(searchLower)
      );

      if (matchingPhrases.length > 0) {
        cluster.phrases = cluster.phrases.filter(p => 
          !p.phrase.toLowerCase().includes(searchLower)
        );
        movedPhrases.push(...matchingPhrases);
      }
    }

    if (movedPhrases.length > 0) {
      targetCluster.phrases = [...targetCluster.phrases, ...movedPhrases]
        .sort((a, b) => b.count - a.count);
      
      toast({
        title: '✅ Перенесено',
        description: `${movedPhrases.length} фраз перенесено в "${targetCluster.cluster_name}"`
      });
    }

    setClusters(newClusters);
  };

  const handleMinusSearchChange = (value: string) => {
    setMinusSearchText(value);

    if (!value.trim()) return;

    const searchLower = value.toLowerCase();
    const movedPhrases: Phrase[] = [];

    const newClusters = clusters.map(cluster => {
      const matchingPhrases = cluster.phrases.filter(p => 
        p.phrase.toLowerCase().includes(searchLower)
      );

      if (matchingPhrases.length > 0) {
        movedPhrases.push(...matchingPhrases);
        return {
          ...cluster,
          phrases: cluster.phrases.filter(p => 
            !p.phrase.toLowerCase().includes(searchLower)
          )
        };
      }

      return cluster;
    });

    if (movedPhrases.length > 0) {
      setMinusPhrases(prev => [...prev, ...movedPhrases].sort((a, b) => b.count - a.count));
      setClusters(newClusters);
      
      toast({
        title: '🚫 В минус-слова',
        description: `${movedPhrases.length} фраз перенесено в минус-слова`
      });
    }
  };

  const removePhrase = (clusterIndex: number, phraseText: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].phrases = newClusters[clusterIndex].phrases.filter(
      p => p.phrase !== phraseText
    );
    setClusters(newClusters);
  };

  const removeMinusPhrase = (phraseText: string) => {
    setMinusPhrases(prev => prev.filter(p => p.phrase !== phraseText));
  };

  const exportToCSV = () => {
    let csv = 'Кластер,Фраза,Частотность\n';
    
    clusters.forEach(cluster => {
      cluster.phrases.forEach(phrase => {
        csv += `"${cluster.cluster_name}","${phrase.phrase}",${phrase.count}\n`;
      });
    });

    minusPhrases.forEach(phrase => {
      csv += `"Минус-слова","${phrase.phrase}",${phrase.count}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({ title: '📊 Экспорт завершен', description: 'Excel файл загружен' });
  };

  const copyClusterPhrases = (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    const text = cluster.phrases.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${cluster.phrases.length} фраз из "${cluster.cluster_name}"` });
  };

  const copyMinusPhrases = () => {
    const text = minusPhrases.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${minusPhrases.length} минус-фраз` });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0) + minusPhrases.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Excel-таблица кластеров</h2>
          <p className="text-sm text-muted-foreground">
            Всего {totalPhrases} фраз • Начните вводить текст для автопереноса
          </p>
        </div>
        <Button onClick={exportToCSV} size="lg" className="gap-2">
          <Icon name="Download" size={20} />
          Скачать Excel
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-4 py-3 text-left font-bold text-slate-700 border-r">Кластер</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700 border-r">Фразы</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700 w-48">Частотность</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((cluster, clusterIdx) => (
              <tr key={clusterIdx} className="border-b hover:bg-slate-50">
                <td 
                  className="px-4 py-3 font-medium align-top border-r"
                  style={{ backgroundColor: cluster.color }}
                >
                  <div className="sticky top-0 space-y-2">
                    <div className="font-bold text-sm">{cluster.cluster_name}</div>
                    <Input
                      placeholder="Введите для переноса..."
                      value={cluster.searchText}
                      onChange={(e) => handleSearchChange(clusterIdx, e.target.value)}
                      className="text-xs h-8"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {cluster.phrases.length} фраз
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyClusterPhrases(clusterIdx)}
                        className="h-6 text-xs"
                      >
                        <Icon name="Copy" size={12} className="mr-1" />
                        Скопировать
                      </Button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 border-r">
                  <div className="space-y-1">
                    {cluster.phrases.map((phrase, phraseIdx) => (
                      <div 
                        key={phraseIdx}
                        className="flex items-center justify-between group hover:bg-white px-2 py-1 rounded"
                      >
                        <span className="text-sm">{phrase.phrase}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhrase(clusterIdx, phrase.phrase)}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        >
                          <Icon name="X" size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {cluster.phrases.map((phrase, phraseIdx) => (
                      <div 
                        key={phraseIdx}
                        className="text-sm font-mono text-right px-2 py-1"
                      >
                        {phrase.count.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}

            <tr className="border-b-2 border-red-300 bg-red-50">
              <td className="px-4 py-3 font-bold align-top border-r bg-red-100">
                <div className="sticky top-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="Ban" size={16} className="text-red-600" />
                    <span className="text-sm">Минус-слова</span>
                  </div>
                  <Input
                    placeholder="Введите для переноса..."
                    value={minusSearchText}
                    onChange={(e) => handleMinusSearchChange(e.target.value)}
                    className="text-xs h-8"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {minusPhrases.length} фраз
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyMinusPhrases}
                      className="h-6 text-xs"
                    >
                      <Icon name="Copy" size={12} className="mr-1" />
                      Скопировать
                    </Button>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 border-r">
                <div className="space-y-1">
                  {minusPhrases.map((phrase, phraseIdx) => (
                    <div 
                      key={phraseIdx}
                      className="flex items-center justify-between group hover:bg-white px-2 py-1 rounded"
                    >
                      <span className="text-sm">{phrase.phrase}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMinusPhrase(phrase.phrase)}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {minusPhrases.map((phrase, phraseIdx) => (
                    <div 
                      key={phraseIdx}
                      className="text-sm font-mono text-right px-2 py-1"
                    >
                      {phrase.count.toLocaleString()}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}