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

export default function ResultsStep({
  clusters: initialClusters,
  minusWords: initialMinusWords,
  onExport,
  onNewProject
}: ResultsStepProps) {
  const [clusters, setClusters] = useState(
    initialClusters.map((c, idx) => ({
      ...c,
      bgColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      searchText: ''
    }))
  );
  const [minusWords, setMinusWords] = useState<Phrase[]>(
    initialMinusWords.map(word => ({ phrase: word, count: 0 }))
  );
  const [minusSearchText, setMinusSearchText] = useState('');
  const { toast } = useToast();

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
        description: `${movedPhrases.length} фраз → "${targetCluster.name}"`
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
      setMinusWords(prev => [...prev, ...movedPhrases].sort((a, b) => b.count - a.count));
      setClusters(newClusters);
      
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
  };

  const removeMinusPhrase = (phraseText: string) => {
    setMinusWords(prev => prev.filter(p => p.phrase !== phraseText));
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Результаты кластеризации</h2>
          <p className="text-xs text-muted-foreground">
            Всего {totalPhrases} фраз • Введите текст в поле кластера для автопереноса
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
            <Icon name="Download" size={16} />
            Excel
          </Button>
          <Button onClick={onExport} size="sm" variant="outline" className="gap-2">
            <Icon name="FileText" size={16} />
            Экспорт
          </Button>
          <Button onClick={onNewProject} size="sm" className="gap-2">
            <Icon name="ArrowLeft" size={16} />
            К проектам
          </Button>
        </div>
      </div>

      <div className="overflow-auto border rounded-lg shadow-lg max-h-[75vh]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr className="border-b-2 border-slate-300">
              {clusters.map((cluster, idx) => (
                <th 
                  key={idx} 
                  className="px-2 py-2 text-left font-bold text-slate-700 border-r min-w-[220px]"
                  style={{ backgroundColor: cluster.bgColor }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon name={cluster.icon as any} size={14} />
                      <span className="font-bold text-xs">{cluster.name}</span>
                    </div>
                    <Input
                      placeholder="Введите текст..."
                      value={cluster.searchText}
                      onChange={(e) => handleSearchChange(idx, e.target.value)}
                      className="h-7 text-xs"
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
                className="px-2 py-2 text-left font-bold border-r min-w-[220px] bg-red-100"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-red-700">
                    <Icon name="Ban" size={14} />
                    <span className="font-bold text-xs">Минус-слова</span>
                  </div>
                  <Input
                    placeholder="Введите текст..."
                    value={minusSearchText}
                    onChange={(e) => handleMinusSearchChange(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{minusWords.length} фраз</span>
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
            {Array.from({ length: maxPhrasesCount }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b hover:bg-slate-50">
                {clusters.map((cluster, clusterIdx) => {
                  const phrase = cluster.phrases[rowIdx];
                  return (
                    <td 
                      key={clusterIdx}
                      className="px-2 py-1.5 border-r align-top"
                      style={{ backgroundColor: phrase ? cluster.bgColor : 'transparent' }}
                    >
                      {phrase && (
                        <div className="flex items-start justify-between group">
                          <div className="flex-1 pr-2">
                            <div className="text-xs leading-tight">{phrase.phrase}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {phrase.count.toLocaleString()}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePhrase(clusterIdx, phrase.phrase)}
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 flex-shrink-0"
                          >
                            <Icon name="X" size={10} />
                          </Button>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td 
                  className="px-2 py-1.5 border-r align-top bg-red-50"
                >
                  {minusWords[rowIdx] && (
                    <div className="flex items-start justify-between group">
                      <div className="flex-1 pr-2">
                        <div className="text-xs leading-tight">{minusWords[rowIdx].phrase}</div>
                        {minusWords[rowIdx].count > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {minusWords[rowIdx].count.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMinusPhrase(minusWords[rowIdx].phrase)}
                        className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 flex-shrink-0"
                      >
                        <Icon name="X" size={10} />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
