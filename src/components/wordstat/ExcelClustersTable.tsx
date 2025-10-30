import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Phrase {
  phrase: string;
  count: number;
  id: string;
}

interface Cluster {
  id: string;
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

function DraggablePhrase({ 
  phrase, 
  onRemove,
  onDragStart,
  onDragEnd
}: { 
  phrase: Phrase; 
  onRemove: () => void;
  onDragStart: (phrase: Phrase) => void;
  onDragEnd: (phrase: Phrase) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('phraseId', phrase.id);
        onDragStart(phrase);
      }}
      onDragEnd={() => onDragEnd(phrase)}
      className="px-2 py-1 border-b border-slate-200 hover:bg-slate-50 cursor-move flex items-center justify-between group"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon name="GripVertical" size={12} className="text-slate-400 flex-shrink-0" />
        <span className="truncate text-xs">{phrase.phrase}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-mono">{phrase.count}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
        >
          <Icon name="X" size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ExcelClustersTable({ 
  initialClusters, 
  initialMinusPhrases 
}: ExcelClustersTableProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [minusPhrases, setMinusPhrases] = useState<Phrase[]>([]);
  const [minusSearchText, setMinusSearchText] = useState('');
  const [draggedPhrase, setDraggedPhrase] = useState<Phrase | null>(null);
  const [dragOverCluster, setDragOverCluster] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setClusters(initialClusters.map((c, idx) => ({
      id: `cluster-${idx}`,
      ...c,
      phrases: c.phrases.map((p: any, pIdx: number) => ({
        ...p,
        id: `phrase-${idx}-${pIdx}-${p.phrase}`,
      })),
      color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      searchText: ''
    })));

    setMinusPhrases(initialMinusPhrases.map((p, idx) => ({
      ...p,
      id: `minus-${idx}-${p.phrase}`,
    })));
  }, [initialClusters, initialMinusPhrases]);

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

    const minusMatching = minusPhrases.filter(p => 
      p.phrase.toLowerCase().includes(searchLower)
    );
    if (minusMatching.length > 0) {
      setMinusPhrases(minusPhrases.filter(p => 
        !p.phrase.toLowerCase().includes(searchLower)
      ));
      movedPhrases.push(...minusMatching);
    }

    if (movedPhrases.length > 0) {
      targetCluster.phrases = [...targetCluster.phrases, ...movedPhrases]
        .sort((a, b) => b.count - a.count);
      
      toast({
        title: '✅ Перенесено',
        description: `${movedPhrases.length} фраз → "${targetCluster.cluster_name}"`
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
        description: `${movedPhrases.length} фраз перенесено`
      });
    }
  };

  const handleDrop = (targetClusterId: string, phraseId: string) => {
    const newClusters = [...clusters];
    let movedPhrase: Phrase | undefined;
    let sourceClusterIndex = -1;

    if (phraseId.startsWith('minus-')) {
      const idx = minusPhrases.findIndex(p => p.id === phraseId);
      if (idx !== -1) {
        movedPhrase = minusPhrases[idx];
        setMinusPhrases(minusPhrases.filter((_, i) => i !== idx));
      }
    } else {
      for (let i = 0; i < newClusters.length; i++) {
        const idx = newClusters[i].phrases.findIndex(p => p.id === phraseId);
        if (idx !== -1) {
          movedPhrase = newClusters[i].phrases[idx];
          sourceClusterIndex = i;
          newClusters[i].phrases = newClusters[i].phrases.filter((_, j) => j !== idx);
          break;
        }
      }
    }

    if (!movedPhrase) return;

    if (targetClusterId === 'minus-drop') {
      setMinusPhrases(prev => [...prev, movedPhrase!]);
      toast({
        title: '🚫 В минус-слова',
        description: `"${movedPhrase.phrase}"`
      });
    } else {
      const targetIndex = newClusters.findIndex(c => c.id === targetClusterId);
      if (targetIndex !== -1) {
        newClusters[targetIndex].phrases.push(movedPhrase);
        newClusters[targetIndex].phrases.sort((a, b) => b.count - a.count);
        toast({
          title: '✅ Перенесено',
          description: `→ "${newClusters[targetIndex].cluster_name}"`
        });
      }
    }

    setClusters(newClusters);
    setDragOverCluster(null);
  };

  const removePhrase = (clusterIndex: number, phraseId: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].phrases = newClusters[clusterIndex].phrases.filter(
      p => p.id !== phraseId
    );
    setClusters(newClusters);
  };

  const removeMinusPhrase = (phraseId: string) => {
    setMinusPhrases(prev => prev.filter(p => p.id !== phraseId));
  };

  const renameCluster = (clusterIndex: number, newName: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].cluster_name = newName;
    setClusters(newClusters);
  };

  const deleteCluster = (clusterIndex: number) => {
    if (!confirm(`Удалить кластер "${clusters[clusterIndex].cluster_name}"?`)) return;
    
    const deletedPhrases = clusters[clusterIndex].phrases;
    setMinusPhrases(prev => [...prev, ...deletedPhrases]);
    setClusters(clusters.filter((_, i) => i !== clusterIndex));
    
    toast({
      title: '🗑️ Кластер удалён',
      description: `${deletedPhrases.length} фраз перенесено в минус-слова`
    });
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
    toast({ title: '📋 Скопировано', description: `${cluster.phrases.length} фраз` });
  };

  const copyMinusPhrases = () => {
    const text = minusPhrases.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${minusPhrases.length} минус-фраз` });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0) + minusPhrases.length;
  const maxPhrasesCount = Math.max(
    ...clusters.map(c => c.phrases.length),
    minusPhrases.length
  );

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Кластеры — Excel режим</h2>
            <p className="text-xs text-muted-foreground">
              Всего {totalPhrases} фраз • Перетаскивайте фразы между колонками
            </p>
          </div>
          <Button onClick={exportToCSV} size="sm" className="gap-2">
            <Icon name="Download" size={16} />
            Скачать Excel
          </Button>
        </div>

        <div className="overflow-auto border rounded-lg shadow-lg max-h-[70vh]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b-2 border-slate-300">
                {clusters.map((cluster, idx) => (
                  <th 
                    key={cluster.id}
                    className="px-2 py-2 text-left font-bold text-slate-700 border-r min-w-[200px]"
                    style={{ backgroundColor: cluster.color }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={cluster.cluster_name}
                          onChange={(e) => renameCluster(idx, e.target.value)}
                          className="h-6 text-xs font-bold border-none bg-transparent p-0"
                        />
                        <button
                          onClick={() => deleteCluster(idx)}
                          className="text-red-500 hover:text-red-700"
                          title="Удалить кластер"
                        >
                          <Icon name="Trash2" size={12} />
                        </button>
                      </div>
                      <Input
                        placeholder="Введите текст..."
                        value={cluster.searchText}
                        onChange={(e) => handleSearchChange(idx, e.target.value)}
                        className="h-6 text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{cluster.phrases.length} фраз</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyClusterPhrases(idx)}
                          className="h-5 px-1 text-[10px]"
                        >
                          <Icon name="Copy" size={10} className="mr-1" />
                          Копировать
                        </Button>
                      </div>
                    </div>
                  </th>
                ))}
                <th 
                  className="px-2 py-2 text-left font-bold border-r min-w-[200px] bg-red-100"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-red-700">
                      <Icon name="Ban" size={12} />
                      <span className="font-bold text-xs">Минус-слова</span>
                    </div>
                    <Input
                      placeholder="Введите текст..."
                      value={minusSearchText}
                      onChange={(e) => handleMinusSearchChange(e.target.value)}
                      className="h-6 text-xs"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{minusPhrases.length} фраз</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyMinusPhrases}
                        className="h-5 px-1 text-[10px]"
                      >
                        <Icon name="Copy" size={10} className="mr-1" />
                        Копировать
                      </Button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {clusters.map((cluster, colIdx) => (
                  <td 
                    key={cluster.id}
                    className="border-r align-top p-0 relative"
                    style={{ backgroundColor: `${cluster.color}30` }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverCluster(cluster.id);
                    }}
                    onDragLeave={() => setDragOverCluster(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const phraseId = e.dataTransfer.getData('phraseId');
                      if (phraseId) handleDrop(cluster.id, phraseId);
                    }}
                  >
                    {dragOverCluster === cluster.id && (
                      <div className="absolute inset-0 bg-blue-200 opacity-30 pointer-events-none z-10" />
                    )}
                    <div className="min-h-[100px]">
                      {cluster.phrases.map((phrase) => (
                        <DraggablePhrase
                          key={phrase.id}
                          phrase={phrase}
                          onDragStart={() => setDraggedPhrase(phrase)}
                          onDragEnd={() => setDraggedPhrase(null)}
                          onRemove={() => removePhrase(colIdx, phrase.id)}
                        />
                      ))}
                    </div>
                  </td>
                ))}
                <td 
                  className="border-r align-top bg-red-50 p-0 relative"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCluster('minus-drop');
                  }}
                  onDragLeave={() => setDragOverCluster(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const phraseId = e.dataTransfer.getData('phraseId');
                    if (phraseId) handleDrop('minus-drop', phraseId);
                  }}
                >
                  {dragOverCluster === 'minus-drop' && (
                    <div className="absolute inset-0 bg-red-200 opacity-30 pointer-events-none z-10" />
                  )}
                  <div className="min-h-[100px]">
                    {minusPhrases.map((phrase) => (
                      <DraggablePhrase
                        key={phrase.id}
                        phrase={phrase}
                        onDragStart={() => setDraggedPhrase(phrase)}
                        onDragEnd={() => setDraggedPhrase(null)}
                        onRemove={() => removeMinusPhrase(phrase.id)}
                      />
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