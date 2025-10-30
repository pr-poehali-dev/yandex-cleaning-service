import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function SortablePhrase({ phrase, onRemove }: { phrase: Phrase; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phrase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
  const [activePhrase, setActivePhrase] = useState<Phrase | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const phraseId = active.id as string;
    
    for (const cluster of clusters) {
      const phrase = cluster.phrases.find(p => p.id === phraseId);
      if (phrase) {
        setActivePhrase(phrase);
        return;
      }
    }
    
    const minusPhrase = minusPhrases.find(p => p.id === phraseId);
    if (minusPhrase) {
      setActivePhrase(minusPhrase);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePhrase(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let sourceClusterIndex = -1;
    let targetClusterIndex = -1;
    let isFromMinus = false;
    let isToMinus = false;

    if (activeId.startsWith('minus-')) {
      isFromMinus = true;
    } else {
      sourceClusterIndex = clusters.findIndex(c => 
        c.phrases.some(p => p.id === activeId)
      );
    }

    if (overId.startsWith('minus-') || overId === 'minus-drop') {
      isToMinus = true;
    } else if (overId.startsWith('cluster-')) {
      targetClusterIndex = clusters.findIndex(c => c.id === overId);
    } else {
      targetClusterIndex = clusters.findIndex(c => 
        c.phrases.some(p => p.id === overId)
      );
    }

    if (sourceClusterIndex === targetClusterIndex && !isFromMinus && !isToMinus) {
      const cluster = clusters[sourceClusterIndex];
      const oldIndex = cluster.phrases.findIndex(p => p.id === activeId);
      const newIndex = cluster.phrases.findIndex(p => p.id === overId);

      if (oldIndex !== newIndex) {
        const newClusters = [...clusters];
        newClusters[sourceClusterIndex].phrases = arrayMove(
          cluster.phrases,
          oldIndex,
          newIndex
        );
        setClusters(newClusters);
      }
      return;
    }

    const newClusters = [...clusters];
    let movedPhrase: Phrase | undefined;

    if (isFromMinus) {
      const phraseIndex = minusPhrases.findIndex(p => p.id === activeId);
      if (phraseIndex !== -1) {
        movedPhrase = minusPhrases[phraseIndex];
        setMinusPhrases(minusPhrases.filter((_, i) => i !== phraseIndex));
      }
    } else if (sourceClusterIndex !== -1) {
      const phraseIndex = newClusters[sourceClusterIndex].phrases.findIndex(
        p => p.id === activeId
      );
      if (phraseIndex !== -1) {
        movedPhrase = newClusters[sourceClusterIndex].phrases[phraseIndex];
        newClusters[sourceClusterIndex].phrases = newClusters[sourceClusterIndex].phrases.filter(
          (_, i) => i !== phraseIndex
        );
      }
    }

    if (!movedPhrase) return;

    if (isToMinus) {
      setMinusPhrases(prev => [...prev, movedPhrase!]);
      toast({
        title: '🚫 В минус-слова',
        description: `"${movedPhrase.phrase}"`
      });
    } else if (targetClusterIndex !== -1) {
      newClusters[targetClusterIndex].phrases.push(movedPhrase);
      newClusters[targetClusterIndex].phrases.sort((a, b) => b.count - a.count);
      toast({
        title: '✅ Перенесено',
        description: `→ "${newClusters[targetClusterIndex].cluster_name}"`
      });
    }

    setClusters(newClusters);
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                    className="border-r align-top p-0"
                    style={{ backgroundColor: `${cluster.color}30` }}
                  >
                    <SortableContext
                      items={cluster.phrases.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div 
                        id={cluster.id}
                        className="min-h-[100px]"
                      >
                        {cluster.phrases.map((phrase) => (
                          <SortablePhrase
                            key={phrase.id}
                            phrase={phrase}
                            onRemove={() => removePhrase(colIdx, phrase.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </td>
                ))}
                <td className="border-r align-top bg-red-50 p-0">
                  <SortableContext
                    items={minusPhrases.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div 
                      id="minus-drop"
                      className="min-h-[100px]"
                    >
                      {minusPhrases.map((phrase) => (
                        <SortablePhrase
                          key={phrase.id}
                          phrase={phrase}
                          onRemove={() => removeMinusPhrase(phrase.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DragOverlay>
        {activePhrase ? (
          <div className="px-2 py-1 bg-white border border-slate-300 rounded shadow-lg text-xs">
            {activePhrase.phrase} ({activePhrase.count})
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}