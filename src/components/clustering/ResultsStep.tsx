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

interface PhraseMove {
  phrase: Phrase;
  fromCluster: number;
  toCluster: number | 'minus';
}

export default function ResultsStep({
  clusters: initialClusters,
  minusWords: initialMinusWords,
  onExport,
  onNewProject,
  projectId,
  onSaveChanges
}: ResultsStepProps) {
  const [originalClusters] = useState(
    initialClusters.map((c, idx) => ({
      ...c,
      bgColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      searchText: ''
    }))
  );
  const [originalMinusWords] = useState<Phrase[]>(
    initialMinusWords.map(word => ({ phrase: word, count: 0 }))
  );
  
  const [clusters, setClusters] = useState(
    initialClusters.map((c, idx) => ({
      ...c,
      bgColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      searchText: '',
      previousSearchText: ''
    }))
  );
  const [minusWords, setMinusWords] = useState<Phrase[]>(
    initialMinusWords.map(word => ({ phrase: word, count: 0 }))
  );
  const [minusSearchText, setMinusSearchText] = useState('');
  const [previousMinusSearchText, setPreviousMinusSearchText] = useState('');
  const [moveHistory, setMoveHistory] = useState<Map<string, number>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const matchesWholeWord = (phrase: string, searchTerm: string): boolean => {
    const trimmed = searchTerm.trim();
    
    // Минимум 3 символа для поиска в кластерах
    if (trimmed.length < 3) return false;
    
    const phraseLower = phrase.toLowerCase();
    const searchLower = trimmed.toLowerCase();
    
    // Разбиваем фразу на слова (разделители: пробелы, дефисы, точки, запятые)
    const words = phraseLower.split(/[\s\-\.\,]+/).filter(w => w.length > 0);
    
    // Ищем только те слова, которые НАЧИНАЮТСЯ с поискового запроса
    return words.some(word => word.startsWith(searchLower));
  };

  // Для минус-слов: ТОЧНОЕ совпадение слова целиком
  // "куплю" найдёт только "куплю", НЕ "купить"
  // "как" найдёт только "как", НЕ "какую" или "какие"
  const matchesForMinus = (phrase: string, searchTerm: string): boolean => {
    const trimmed = searchTerm.trim();
    if (trimmed.length === 0) return false;
    
    const phraseLower = phrase.toLowerCase();
    const searchLower = trimmed.toLowerCase();
    
    // Разбиваем фразу на слова
    const words = phraseLower.split(/[\s\-\.\,]+/).filter(w => w.length > 0);
    
    // ВСЕГДА используем ТОЧНОЕ совпадение для минус-слов
    return words.some(word => word === searchLower);
  };

  const handleSearchChange = (clusterIndex: number, value: string) => {
    const newClusters = [...clusters];
    const targetCluster = newClusters[clusterIndex];
    const previousSearch = targetCluster.searchText;
    targetCluster.searchText = value;

    if (!value.trim()) {
      if (previousSearch.trim()) {
        const phrasesToReturn = targetCluster.phrases.filter(p => {
          const originalCluster = moveHistory.get(p.phrase);
          return originalCluster !== undefined && originalCluster !== clusterIndex;
        });

        phrasesToReturn.forEach(p => {
          const originalClusterIdx = moveHistory.get(p.phrase);
          if (originalClusterIdx !== undefined && originalClusterIdx !== clusterIndex) {
            newClusters[originalClusterIdx].phrases.push(p);
            newClusters[originalClusterIdx].phrases.sort((a, b) => b.count - a.count);
          }
        });

        targetCluster.phrases = targetCluster.phrases.filter(p => {
          const originalCluster = moveHistory.get(p.phrase);
          return originalCluster === undefined || originalCluster === clusterIndex;
        });

        phrasesToReturn.forEach(p => moveHistory.delete(p.phrase));
      }
      setClusters(newClusters);
      return;
    }

    const movedPhrases: Phrase[] = [];
    const newHistory = new Map(moveHistory);

    // ШАГ 1: Обработать фразы в целевом кластере
    // 1а) Вернуть ПЕРЕНЕСЁННЫЕ фразы, которые больше не подходят
    const phrasesToReturn = targetCluster.phrases.filter(p => {
      const originalCluster = moveHistory.get(p.phrase);
      const stillMatches = matchesWholeWord(p.phrase, value);
      return originalCluster !== undefined && originalCluster !== clusterIndex && !stillMatches;
    });

    if (phrasesToReturn.length > 0) {
      phrasesToReturn.forEach(p => {
        const originalClusterIdx = moveHistory.get(p.phrase);
        if (originalClusterIdx !== undefined) {
          newClusters[originalClusterIdx].phrases.push(p);
          newClusters[originalClusterIdx].phrases.sort((a, b) => b.count - a.count);
          newHistory.delete(p.phrase);
        }
      });
    }

    // 1б) СКРЫТЬ оригинальные фразы кластера, которые не подходят под поиск
    const originalPhrases = targetCluster.phrases.filter(p => {
      const originalCluster = moveHistory.get(p.phrase);
      // Это оригинальная фраза кластера (не была перенесена)
      return originalCluster === undefined || originalCluster === clusterIndex;
    });

    // Оставляем только: перенесённые фразы (подходящие) + оригинальные фразы (подходящие)
    targetCluster.phrases = targetCluster.phrases.filter(p => {
      const originalCluster = moveHistory.get(p.phrase);
      const stillMatches = matchesWholeWord(p.phrase, value);
      
      // Перенесённая фраза → показываем только если подходит
      if (originalCluster !== undefined && originalCluster !== clusterIndex) {
        return stillMatches;
      }
      
      // Оригинальная фраза → показываем только если подходит
      return stillMatches;
    });

    // ШАГ 2: Найти новые фразы, которые подходят под поиск
    for (let i = 0; i < newClusters.length; i++) {
      if (i === clusterIndex) continue;

      const cluster = newClusters[i];
      const matchingPhrases = cluster.phrases.filter(p => matchesWholeWord(p.phrase, value));

      if (matchingPhrases.length > 0) {
        cluster.phrases = cluster.phrases.filter(p => 
          !matchesWholeWord(p.phrase, value)
        );
        matchingPhrases.forEach(p => {
          if (!newHistory.has(p.phrase)) {
            newHistory.set(p.phrase, i);
          }
        });
        movedPhrases.push(...matchingPhrases);
      }
    }

    if (movedPhrases.length > 0) {
      targetCluster.phrases = [...targetCluster.phrases, ...movedPhrases]
        .sort((a, b) => b.count - a.count);
      
      setMoveHistory(newHistory);
      setHasChanges(true);
      
      toast({
        title: '✅ Перенесено',
        description: `${movedPhrases.length} фраз → "${targetCluster.name}"`
      });
    }

    setClusters(newClusters);
  };

  const handleMinusSearchChange = (value: string) => {
    const previousSearch = minusSearchText;
    setMinusSearchText(value);

    if (!value.trim()) {
      if (previousSearch.trim()) {
        const phrasesToReturn = minusWords.filter(p => {
          const originalCluster = moveHistory.get(p.phrase);
          return originalCluster !== undefined;
        });

        if (phrasesToReturn.length > 0) {
          const newClusters = [...clusters];
          phrasesToReturn.forEach(p => {
            const originalClusterIdx = moveHistory.get(p.phrase);
            if (originalClusterIdx !== undefined) {
              newClusters[originalClusterIdx].phrases.push(p);
              newClusters[originalClusterIdx].phrases.sort((a, b) => b.count - a.count);
              moveHistory.delete(p.phrase);
            }
          });

          setMinusWords(prev => prev.filter(p => !moveHistory.has(p.phrase) || moveHistory.get(p.phrase) === undefined));
          setClusters(newClusters);
        }
      }
      return;
    }

    const movedPhrases: Phrase[] = [];
    const newHistory = new Map(moveHistory);

    const newClusters = clusters.map((cluster, clusterIdx) => {
      const matchingPhrases = cluster.phrases.filter(p => 
        matchesForMinus(p.phrase, value)
      );

      if (matchingPhrases.length > 0) {
        matchingPhrases.forEach(p => {
          if (!newHistory.has(p.phrase)) {
            newHistory.set(p.phrase, clusterIdx);
          }
        });
        movedPhrases.push(...matchingPhrases);
        return {
          ...cluster,
          phrases: cluster.phrases.filter(p => 
            !matchesForMinus(p.phrase, value)
          )
        };
      }

      return cluster;
    });

    if (movedPhrases.length > 0) {
      setMinusWords(prev => [...prev, ...movedPhrases].sort((a, b) => b.count - a.count));
      setClusters(newClusters);
      setMoveHistory(newHistory);
      setHasChanges(true);
      
      toast({
        title: '🚫 В минус-слова',
        description: `${movedPhrases.length} фраз перенесено`
      });
    }
  };

  const removePhrase = (clusterIndex: number, phraseText: string) => {
    const newClusters = [...clusters];
    newClusters[clusterIndex].phrases = newClusters[clusterIndex].phrases.filter(
      p => p.phrase !== phraseText
    );
    setClusters(newClusters);
    setHasChanges(true);
  };

  const removeMinusPhrase = (phraseText: string) => {
    setMinusWords(prev => prev.filter(p => p.phrase !== phraseText));
    setHasChanges(true);
  };

  const handleReset = () => {
    setClusters(JSON.parse(JSON.stringify(originalClusters)));
    setMinusWords(JSON.parse(JSON.stringify(originalMinusWords)));
    setHasChanges(false);
    toast({
      title: '↩️ Отменено',
      description: 'Возврат к исходному результату'
    });
  };

  const handleSave = async () => {
    if (!projectId || !onSaveChanges) return;
    
    setIsSaving(true);
    try {
      const cleanClusters = clusters.map(({ bgColor, searchText, ...rest }) => rest);
      await onSaveChanges(cleanClusters, minusWords);
      setHasChanges(false);
      toast({
        title: '💾 Сохранено',
        description: 'Изменения успешно сохранены'
      });
    } catch (error) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось сохранить изменения',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyClusterPhrases = (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    const text = cluster.phrases.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${cluster.phrases.length} фраз из "${cluster.name}"` });
  };

  const copyMinusPhrases = () => {
    const text = minusWords.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${minusWords.length} минус-слов` });
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
    
    toast({ title: '📊 Экспорт завершен', description: 'Excel файл загружен' });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0) + minusWords.length;
  const maxPhrasesCount = Math.max(
    ...clusters.map(c => c.phrases.length),
    minusWords.length
  );

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-shrink-0 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-lg font-bold">Результаты кластеризации</h2>
            <p className="text-xs text-muted-foreground">
              {totalPhrases} фраз • Введите текст в поле кластера для автопереноса
              {hasChanges && <span className="text-orange-600 font-semibold ml-2">⚠️ Есть несохранённые изменения</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <>
                <Button onClick={handleReset} size="sm" variant="outline" className="gap-1.5">
                  <Icon name="RotateCcw" size={14} />
                  Отменить
                </Button>
                <Button onClick={handleSave} size="sm" disabled={isSaving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Icon name={isSaving ? "Loader2" : "Save"} size={14} className={isSaving ? "animate-spin" : ""} />
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </>
            )}
            <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-1.5">
              <Icon name="Download" size={14} />
              Excel
            </Button>
            <Button onClick={onExport} size="sm" variant="outline" className="gap-1.5">
              <Icon name="FileText" size={14} />
              Экспорт
            </Button>
            <Button onClick={onNewProject} size="sm" className="gap-1.5">
              <Icon name="ArrowLeft" size={14} />
              К проектам
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 shadow-md">
            <tr>
              {clusters.map((cluster, idx) => (
                <th 
                  key={idx} 
                  className="px-3 py-3 text-left border-r border-white/30 min-w-[280px] max-w-[380px]"
                  style={{ backgroundColor: cluster.bgColor }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon name={cluster.icon as any} size={16} className="flex-shrink-0" />
                      <Input
                        value={cluster.name}
                        onChange={(e) => {
                          const newClusters = [...clusters];
                          newClusters[idx].name = e.target.value;
                          setClusters(newClusters);
                          setHasChanges(true);
                        }}
                        className="h-7 font-bold bg-transparent border-transparent hover:border-slate-300 focus:border-slate-400 focus:bg-white/90 px-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground flex-shrink-0">{cluster.phrases.length}</span>
                    </div>
                    <Input
                      placeholder="🔍 Искать и перенести сюда..."
                      value={cluster.searchText}
                      onChange={(e) => handleSearchChange(idx, e.target.value)}
                      className="h-8 text-sm bg-white/80 border-slate-300 focus:bg-white"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyClusterPhrases(idx)}
                      className="h-6 w-full text-xs hover:bg-white/60"
                    >
                      <Icon name="Copy" size={12} className="mr-1.5" />
                      Копировать {cluster.phrases.length} фраз
                    </Button>
                  </div>
                </th>
              ))}
              <th 
                className="px-3 py-3 text-left border-r border-white/30 min-w-[280px] max-w-[380px] bg-red-100"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-700">
                    <Icon name="Ban" size={16} className="flex-shrink-0" />
                    <span className="font-bold">Минус-слова</span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{minusWords.length}</span>
                  </div>
                  <Input
                    placeholder="🚫 Искать и убрать из кластеров..."
                    value={minusSearchText}
                    onChange={(e) => handleMinusSearchChange(e.target.value)}
                    className="h-8 text-sm bg-white/80 border-red-300 focus:bg-white"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyMinusPhrases}
                    className="h-6 w-full text-xs hover:bg-white/60"
                  >
                    <Icon name="Copy" size={12} className="mr-1.5" />
                    Копировать {minusWords.length} фраз
                  </Button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxPhrasesCount }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-slate-200">
                {clusters.map((cluster, clusterIdx) => {
                  const phrase = cluster.phrases[rowIdx];
                  const originalClusterIdx = phrase ? moveHistory.get(phrase.phrase) : undefined;
                  const isMovedPhrase = originalClusterIdx !== undefined && originalClusterIdx !== clusterIdx;
                  const originalCluster = isMovedPhrase ? clusters[originalClusterIdx] : null;
                  
                  return (
                    <td 
                      key={clusterIdx}
                      className="px-3 py-2 border-r border-slate-200 align-top"
                      style={{ backgroundColor: phrase ? `${cluster.bgColor}40` : 'white' }}
                    >
                      {phrase && (
                        <div 
                          className="flex items-start justify-between gap-2 group hover:bg-white/60 rounded px-1 -mx-1 relative"
                          style={isMovedPhrase && originalCluster ? {
                            borderLeft: `3px solid ${originalCluster.bgColor}`,
                            paddingLeft: '6px',
                            marginLeft: '-4px'
                          } : {}}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm leading-snug break-words">{phrase.phrase}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="text-xs text-slate-500 font-mono">
                                {phrase.count.toLocaleString()}
                              </div>
                              {isMovedPhrase && originalCluster && (
                                <div 
                                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                  style={{ 
                                    backgroundColor: originalCluster.bgColor,
                                    color: '#475569'
                                  }}
                                >
                                  из {originalCluster.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePhrase(clusterIdx, phrase.phrase)}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex-shrink-0 hover:bg-red-100"
                          >
                            <Icon name="X" size={12} />
                          </Button>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td 
                  className="px-3 py-2 border-r border-slate-200 align-top bg-red-50/40"
                >
                  {minusWords[rowIdx] && (() => {
                    const phrase = minusWords[rowIdx];
                    const originalClusterIdx = moveHistory.get(phrase.phrase);
                    const isMovedPhrase = originalClusterIdx !== undefined;
                    const originalCluster = isMovedPhrase ? clusters[originalClusterIdx] : null;
                    
                    return (
                      <div 
                        className="flex items-start justify-between gap-2 group hover:bg-white/60 rounded px-1 -mx-1 relative"
                        style={isMovedPhrase && originalCluster ? {
                          borderLeft: `3px solid ${originalCluster.bgColor}`,
                          paddingLeft: '6px',
                          marginLeft: '-4px'
                        } : {}}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm leading-snug break-words">{phrase.phrase}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {phrase.count > 0 && (
                              <div className="text-xs text-slate-500 font-mono">
                                {phrase.count.toLocaleString()}
                              </div>
                            )}
                            {isMovedPhrase && originalCluster && (
                              <div 
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ 
                                  backgroundColor: originalCluster.bgColor,
                                  color: '#475569'
                                }}
                              >
                                из {originalCluster.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMinusPhrase(phrase.phrase)}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex-shrink-0 hover:bg-red-100"
                        >
                          <Icon name="X" size={12} />
                        </Button>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}