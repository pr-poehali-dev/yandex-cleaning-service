import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Phrase {
  phrase: string;
  count: number;
  sourceCluster?: string;
  sourceColor?: string;
  isTemporary?: boolean;
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
  minusWords: Phrase[];
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
  clusters: propsClusters,
  minusWords: propsMinusWords,
  onExport,
  onNewProject,
  projectId,
  onSaveChanges
}: ResultsStepProps) {
  const initialClusters = propsClusters.map((c, idx) => ({
    ...c,
    bgColor: CLUSTER_BG_COLORS[idx % CLUSTER_BG_COLORS.length],
    searchText: '',
    hovering: false
  }));
  
  const [clusters, setClusters] = useState(initialClusters);
  const [minusWords, setMinusWords] = useState<Phrase[]>(propsMinusWords);
  const [minusSearchText, setMinusSearchText] = useState('');
  const { toast } = useToast();

  const clustersDataKey = propsClusters.map(c => c.name).join(',');
  
  useEffect(() => {
    console.log('🔄 ResultsStep: Data changed, updating state');
    setClusters(
      propsClusters.map((c, idx) => ({
        ...c,
        bgColor: CLUSTER_BG_COLORS[idx % CLUSTER_BG_COLORS.length],
        searchText: '',
        hovering: false
      }))
    );
    setMinusWords(propsMinusWords);
  }, [clustersDataKey]);

  const matchesSearch = (phrase: string, searchTerm: string): boolean => {
    if (!searchTerm.trim()) return false;
    return phrase.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const handleSearchChange = (clusterIndex: number, value: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].searchText = value;
    setClusters(newClusters);
  };

  const getFilteredPhrases = (clusterIndex: number, searchText: string) => {
    const cluster = clusters[clusterIndex];
    const searchTerm = searchText?.toLowerCase().trim() || '';
    
    if (!searchTerm) {
      return cluster.phrases.filter(p => !p.isTemporary);
    }

    const ownPhrases = cluster.phrases.filter(p => !p.isTemporary);
    const tempPhrases = [...ownPhrases];
    
    clusters.forEach((otherCluster, i) => {
      if (i === clusterIndex) return;
      
      otherCluster.phrases.forEach(p => {
        if (!p.sourceCluster && p.phrase.toLowerCase().includes(searchTerm)) {
          tempPhrases.push({
            ...p,
            sourceCluster: otherCluster.name,
            sourceColor: otherCluster.bgColor,
            isTemporary: true
          });
        }
      });
    });
    
    return tempPhrases.sort((a, b) => b.count - a.count);
  };

  const handleConfirmSearch = async (targetIndex: number) => {
    const newClusters = [...clusters];
    const targetCluster = newClusters[targetIndex];
    const searchTerm = targetCluster.searchText.toLowerCase();

    if (!searchTerm) return;

    const movedPhrases: Phrase[] = [];

    for (let i = 0; i < newClusters.length; i++) {
      if (i === targetIndex) continue;

      const cluster = newClusters[i];
      const matchingPhrases = cluster.phrases.filter(p =>
        p.phrase.toLowerCase().includes(searchTerm) && !p.sourceCluster
      );

      if (matchingPhrases.length > 0) {
        cluster.phrases = cluster.phrases.filter(p =>
          !p.phrase.toLowerCase().includes(searchTerm) || p.sourceCluster
        );
        
        const phrasesWithSource = matchingPhrases.map(p => ({
          ...p,
          sourceCluster: cluster.name,
          sourceColor: cluster.bgColor,
          isTemporary: false
        }));
        
        movedPhrases.push(...phrasesWithSource);
      }
    }

    if (movedPhrases.length > 0) {
      targetCluster.phrases = [...targetCluster.phrases, ...movedPhrases]
        .sort((a, b) => b.count - a.count);
      targetCluster.searchText = '';

      setClusters(newClusters);

      if (onSaveChanges) {
        await onSaveChanges(
          newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
          minusWords
        );
      }

      toast({
        title: '✅ Перенесено',
        description: `${movedPhrases.length} фраз`
      });
    }
  };

  const handleMinusSearchChange = (value: string) => {
    setMinusSearchText(value);
  };

  const handleConfirmMinusSearch = () => {
    const searchTerm = minusSearchText.toLowerCase();
    if (!searchTerm) return;

    const newClusters = [...clusters];
    const removedPhrases: Phrase[] = [];

    for (const cluster of newClusters) {
      const matchingPhrases = cluster.phrases.filter(p =>
        p.phrase.toLowerCase().includes(searchTerm)
      );

      if (matchingPhrases.length > 0) {
        cluster.phrases = cluster.phrases.filter(p =>
          !p.phrase.toLowerCase().includes(searchTerm)
        );
        removedPhrases.push(...matchingPhrases);
      }
    }

    if (removedPhrases.length > 0) {
      setMinusWords([...minusWords, ...removedPhrases].sort((a, b) => b.count - a.count));
      setClusters(newClusters);
      setMinusSearchText('');

      toast({
        title: '🚫 Добавлено в минус-слова',
        description: `${removedPhrases.length} фраз`
      });
    }
  };

  const renameCluster = async (clusterIndex: number, newName: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].name = newName;
    setClusters(newClusters);

    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
    }
  };

  const deleteCluster = async (clusterIndex: number) => {
    if (!confirm(`Удалить кластер "${clusters[clusterIndex].name}"?`)) return;

    const newClusters = clusters.filter((_, idx) => idx !== clusterIndex);
    setClusters(newClusters);

    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
    }

    toast({
      title: '🗑️ Кластер удалён'
    });
  };

  const removePhrase = async (clusterIndex: number, phraseIndex: number) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].phrases = newClusters[clusterIndex].phrases.filter(
      (_, idx) => idx !== phraseIndex
    );
    setClusters(newClusters);

    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
    }
  };

  const addNewCluster = async (afterIndex: number) => {
    const newCluster = {
      name: `Новый кластер ${clusters.length + 1}`,
      intent: 'informational',
      color: 'gray',
      icon: 'Folder',
      phrases: [],
      bgColor: CLUSTER_BG_COLORS[clusters.length % CLUSTER_BG_COLORS.length],
      searchText: '',
      hovering: false
    };

    const newClusters = [
      ...clusters.slice(0, afterIndex + 1),
      newCluster,
      ...clusters.slice(afterIndex + 1)
    ];
    setClusters(newClusters);

    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
    }

    toast({
      title: '✨ Кластер создан'
    });
  };

  const copyClusterPhrases = (phrases: Phrase[]) => {
    const text = phrases.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${phrases.length} фраз` });
  };

  const copyMinusPhrases = () => {
    const text = minusWords.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${minusWords.length} минус-фраз` });
  };

  const exportToCSV = () => {
    let csv = 'Кластер,Фраза,Частотность\n';

    clusters.forEach(cluster => {
      cluster.phrases.forEach(phrase => {
        csv += `"${cluster.name}","${phrase.phrase}",${phrase.count}\n`;
      });
    });

    minusWords.forEach(phrase => {
      csv += `"Минус-слова","${phrase.phrase}",${phrase.count}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: '📊 Экспорт завершен' });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0) + minusWords.length;

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

          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full px-6">
          {clusters.map((cluster, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 border-r border-gray-300 flex flex-col group relative"
              style={{ 
                width: '280px',
                backgroundColor: cluster.bgColor
              }}
              onMouseEnter={() => {
                const newClusters = [...clusters];
                newClusters[idx].hovering = true;
                setClusters(newClusters);
              }}
              onMouseLeave={() => {
                const newClusters = [...clusters];
                newClusters[idx].hovering = false;
                setClusters(newClusters);
              }}
            >
              {cluster.hovering && (
                <button
                  onClick={() => addNewCluster(idx)}
                  className="absolute -right-3 top-3 z-10 w-6 h-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <Icon name="Plus" size={14} />
                </button>
              )}

              <div className="p-3 border-b border-gray-200" style={{ backgroundColor: cluster.bgColor }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={cluster.icon as any} size={18} className="text-gray-700" />
                  <Input
                    value={cluster.name}
                    onChange={(e) => renameCluster(idx, e.target.value)}
                    className="font-semibold text-sm h-7 border-transparent hover:border-gray-300 focus:border-gray-400 bg-transparent flex-1"
                  />
                </div>

                <div className="flex gap-1.5 mb-2">
                  <Input
                    placeholder="Поиск..."
                    value={cluster.searchText}
                    onChange={(e) => handleSearchChange(idx, e.target.value)}
                    className="h-8 text-sm bg-white border-gray-300 flex-1"
                  />
                  {cluster.searchText && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmSearch(idx)}
                      className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                    >
                      <Icon name="Check" size={14} />
                    </Button>
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  {getFilteredPhrases(idx, cluster.searchText).length} фраз
                </div>

                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyClusterPhrases(cluster.phrases)}
                    className="flex-1 text-xs h-7 hover:bg-white/80"
                  >
                    <Icon name="Copy" size={12} className="mr-1.5" />
                    Копировать
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCluster(idx)}
                    className="text-xs h-7 px-2 hover:bg-red-50 hover:text-red-700"
                  >
                    <Icon name="Trash2" size={12} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {getFilteredPhrases(idx, cluster.searchText).map((phrase, pIdx) => {
                  return (
                    <div
                      key={pIdx}
                      className="px-3 py-2 border-b border-gray-200 hover:bg-white/40 group/phrase"
                      style={phrase.sourceColor ? {
                        backgroundColor: phrase.sourceColor,
                        borderLeft: `3px solid ${phrase.sourceColor}`
                      } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 leading-snug mb-1">
                            {phrase.phrase}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500 font-mono">
                              {phrase.count.toLocaleString()}
                            </div>
                            {phrase.sourceCluster && (
                              <div className="text-xs text-gray-600 italic">
                                из "{phrase.sourceCluster}"
                              </div>
                            )}
                          </div>
                        </div>
                        {!phrase.isTemporary && (
                          <button
                            onClick={() => {
                              const originalIndex = cluster.phrases.findIndex(p => p.phrase === phrase.phrase);
                              removePhrase(idx, originalIndex);
                            }}
                            className="opacity-0 group-hover/phrase:opacity-100 text-gray-700 hover:text-gray-900 flex-shrink-0"
                          >
                            <Icon name="X" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div
            className="flex-shrink-0 border-r border-gray-300 flex flex-col"
            style={{ 
              width: '280px',
              backgroundColor: '#FFE8E8'
            }}
          >
            <div className="p-3 border-b border-gray-200 bg-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Ban" size={18} className="text-red-700" />
                <span className="font-semibold text-sm text-red-700 flex-1">
                  Минус-слова
                </span>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {minusWords.length}
                </span>
              </div>

              <div className="flex gap-1.5 mb-2">
                <Input
                  placeholder="Поиск..."
                  value={minusSearchText}
                  onChange={(e) => handleMinusSearchChange(e.target.value)}
                  className="h-8 text-sm bg-white border-red-300 flex-1"
                />
                {minusSearchText && (
                  <Button
                    size="sm"
                    onClick={handleConfirmMinusSearch}
                    className="h-8 px-3 bg-red-600 hover:bg-red-700 flex-shrink-0"
                  >
                    <Icon name="Check" size={14} />
                  </Button>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-2">
                {minusWords.length} фраз
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={copyMinusPhrases}
                className="w-full text-xs h-7 hover:bg-white/80"
              >
                <Icon name="Copy" size={12} className="mr-1.5" />
                Копировать
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {minusWords.map((phrase, pIdx) => (
                <div
                  key={pIdx}
                  className="px-3 py-2 border-b border-gray-200 hover:bg-white/40"
                >
                  <div className="text-sm text-gray-800 leading-snug mb-1">
                    {phrase.phrase}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {phrase.count > 0 ? phrase.count.toLocaleString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}