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
  highlightedPhrases?: Set<string>;
}

interface MinusWord {
  word: string;
  count: number;
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
  onDragEnd,
  isHighlighted,
  highlightColor
}: { 
  phrase: Phrase; 
  onRemove: () => void;
  onDragStart: (phrase: Phrase) => void;
  onDragEnd: (phrase: Phrase) => void;
  isHighlighted?: boolean;
  highlightColor?: string;
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
      style={isHighlighted ? { 
        backgroundColor: highlightColor || '#FFF59D',
        borderLeft: `3px solid ${highlightColor || '#FBC02D'}`,
        fontWeight: 600
      } : {}}
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
  const [minusWords, setMinusWords] = useState<MinusWord[]>([]);
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
      for (const cluster of newClusters) {
        cluster.highlightedPhrases = undefined;
      }
      setClusters(newClusters);
      return;
    }

    const searchLower = value.toLowerCase();
    const highlightedSet = new Set<string>();

    for (let i = 0; i < newClusters.length; i++) {
      const cluster = newClusters[i];
      cluster.phrases.forEach(p => {
        if (p.phrase.toLowerCase().includes(searchLower)) {
          highlightedSet.add(p.phrase);
        }
      });
      cluster.highlightedPhrases = highlightedSet;
    }

    setClusters(newClusters);
  };

  const moveHighlightedPhrases = (targetClusterIndex: number) => {
    const newClusters = [...clusters];
    const targetCluster = newClusters[targetClusterIndex];
    const searchLower = targetCluster.searchText.toLowerCase();

    if (!searchLower) return;

    const movedPhrases: Phrase[] = [];

    for (let i = 0; i < newClusters.length; i++) {
      if (i === targetClusterIndex) continue;

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
      targetCluster.searchText = '';
      targetCluster.highlightedPhrases = undefined;
      
      toast({
        title: '✅ Перенесено',
        description: `${movedPhrases.length} фраз → "${targetCluster.cluster_name}"`
      });
    }

    for (const cluster of newClusters) {
      cluster.highlightedPhrases = undefined;
    }

    setClusters(newClusters);
  };

  const handleMinusSearchChange = (value: string) => {
    setMinusSearchText(value);

    if (!value.trim()) return;

    const minusWord = value.trim().toLowerCase();
    let phrasesRemoved = 0;

    const newClusters = clusters.map(cluster => {
      const filteredPhrases = cluster.phrases.filter(p => {
        const hasMinusWord = p.phrase.toLowerCase().includes(minusWord);
        if (hasMinusWord) phrasesRemoved++;
        return !hasMinusWord;
      });

      return {
        ...cluster,
        phrases: filteredPhrases
      };
    });

    const existingMinusWord = minusWords.find(m => m.word === minusWord);
    if (existingMinusWord) {
      existingMinusWord.count += phrasesRemoved;
      setMinusWords([...minusWords]);
    } else {
      setMinusWords(prev => [...prev, { word: minusWord, count: phrasesRemoved }]);
    }

    setClusters(newClusters);
    setMinusSearchText('');
    
    toast({
      title: '🚫 Минус-слово добавлено',
      description: `"${minusWord}" — удалено ${phrasesRemoved} фраз`
    });
  };

  const handleDrop = (targetClusterId: string, phraseId: string) => {
    const newClusters = [...clusters];
    let movedPhrase: Phrase | undefined;

    for (let i = 0; i < newClusters.length; i++) {
      const idx = newClusters[i].phrases.findIndex(p => p.id === phraseId);
      if (idx !== -1) {
        movedPhrase = newClusters[i].phrases[idx];
        newClusters[i].phrases = newClusters[i].phrases.filter((_, j) => j !== idx);
        break;
      }
    }

    if (!movedPhrase) return;

    const targetIndex = newClusters.findIndex(c => c.id === targetClusterId);
    if (targetIndex !== -1) {
      newClusters[targetIndex].phrases.push(movedPhrase);
      newClusters[targetIndex].phrases.sort((a, b) => b.count - a.count);
      toast({
        title: '✅ Перенесено',
        description: `→ "${newClusters[targetIndex].cluster_name}"`
      });
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

  const renameCluster = (clusterIndex: number, newName: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].cluster_name = newName;
    setClusters(newClusters);
  };

  const deleteCluster = (clusterIndex: number) => {
    if (!confirm(`Удалить кластер "${clusters[clusterIndex].cluster_name}"?`)) return;
    
    setClusters(clusters.filter((_, i) => i !== clusterIndex));
    
    toast({
      title: '🗑️ Кластер удалён',
      description: 'Фразы удалены из результатов'
    });
  };

  const exportToCSV = () => {
    let csv = 'Кластер,Фраза,Частотность\n';
    
    clusters.forEach(cluster => {
      cluster.phrases.forEach(phrase => {
        csv += `"${cluster.cluster_name}","${phrase.phrase}",${phrase.count}\n`;
      });
    });

    csv += '\nМинус-слова (включения)\n';
    minusWords.forEach(minusWord => {
      csv += `"Минус-слово","${minusWord.word}",${minusWord.count}\n`;
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

  const copyMinusWords = () => {
    const text = minusWords.map(m => m.word).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${minusWords.length} минус-слов` });
  };

  const removeMinusWord = (word: string) => {
    setMinusWords(prev => prev.filter(m => m.word !== word));
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0);

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Кластеры — Excel режим</h2>
            <p className="text-xs text-muted-foreground">
              Всего {totalPhrases} фраз • {minusWords.length} минус-слов
            </p>
            <p className="text-xs text-blue-600 mt-1">
              💡 Введите текст в поле кластера → подсветятся все фразы → Enter для переноса
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
                      <div className="flex gap-1">
                        <Input
                          placeholder="Найти фразы..."
                          value={cluster.searchText}
                          onChange={(e) => handleSearchChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              moveHighlightedPhrases(idx);
                            }
                          }}
                          className="h-6 text-xs flex-1"
                        />
                        {cluster.searchText && (
                          <Button
                            size="sm"
                            onClick={() => moveHighlightedPhrases(idx)}
                            className="h-6 px-2"
                            title="Перенести найденные фразы"
                          >
                            <Icon name="ArrowDown" size={12} />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {cluster.phrases.length} фраз
                          {cluster.highlightedPhrases && cluster.highlightedPhrases.size > 0 && (
                            <span className="ml-1 text-blue-600 font-bold">
                              ({cluster.highlightedPhrases.size} найдено)
                            </span>
                          )}
                        </span>
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
                      placeholder="Введите минус-слово..."
                      value={minusSearchText}
                      onChange={(e) => setMinusSearchText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleMinusSearchChange(minusSearchText);
                        }
                      }}
                      className="h-6 text-xs"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{minusWords.length} слов</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyMinusWords}
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
                      {cluster.phrases.map((phrase) => {
                        const isHighlighted = cluster.highlightedPhrases?.has(phrase.phrase) || false;
                        return (
                          <DraggablePhrase
                            key={phrase.id}
                            phrase={phrase}
                            onDragStart={() => setDraggedPhrase(phrase)}
                            onDragEnd={() => setDraggedPhrase(null)}
                            onRemove={() => removePhrase(colIdx, phrase.id)}
                            isHighlighted={isHighlighted}
                            highlightColor={cluster.color}
                          />
                        );
                      })}
                    </div>
                  </td>
                ))}
                <td className="border-r align-top bg-red-50 p-0">
                  <div className="min-h-[100px]">
                    {minusWords.map((minusWord, idx) => (
                      <div 
                        key={idx}
                        className="px-2 py-1 border-b border-red-200 hover:bg-red-100 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon name="Ban" size={12} className="text-red-500 flex-shrink-0" />
                          <span className="truncate text-xs font-medium text-red-700">{minusWord.word}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-red-600 font-mono">-{minusWord.count}</span>
                          <button
                            onClick={() => removeMinusWord(minusWord.word)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        </div>
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