import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import AppSidebar from '@/components/layout/AppSidebar';
import ClusteringInputStep from '@/components/clustering/ClusteringInputStep';
import ClusteringResults from '@/components/clustering/ClusteringResults';
import { aiClustersMock, minusWordsMock, type Cluster } from '@/components/clustering/ClusteringMockData';

type Step = 'input' | 'results';

export default function TestClustering() {
  const [step, setStep] = useState<Step>('input');
  const [keywords, setKeywords] = useState('купить квартиру');
  const [loading, setLoading] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [clusters] = useState<Cluster[]>(aiClustersMock);
  const [minusWords] = useState<string[]>(minusWordsMock);
  const { toast } = useToast();

  const toggleCluster = (name: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      setExpandedClusters(new Set([...clusters.map(c => c.name), 'minus-words']));
      setStep('results');
      setLoading(false);
      toast({ 
        title: 'Готово!', 
        description: `Найдено ${clusters.length} кластеров и ${minusWords.length} минус-слов` 
      });
    }, 2000);
  };

  const exportMinusWords = () => {
    const minusText = minusWords.join('\n');
    const blob = new Blob([minusText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minus-words.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Экспорт завершён',
      description: 'Минус-слова сохранены в файл'
    });
  };

  const exportCluster = (cluster: Cluster) => {
    const text = cluster.phrases.map(p => p.phrase).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-${cluster.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Экспорт завершён',
      description: `Кластер "${cluster.name}" сохранён в файл`
    });
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 ml-64">
        <div className="max-w-6xl mx-auto">
        {step === 'input' ? (
          <ClusteringInputStep
            keywords={keywords}
            setKeywords={setKeywords}
            loading={loading}
            onAnalyze={handleAnalyze}
          />
        ) : (
          <ClusteringResults
            clusters={clusters}
            minusWords={minusWords}
            expandedClusters={expandedClusters}
            toggleCluster={toggleCluster}
            exportMinusWords={exportMinusWords}
            exportCluster={exportCluster}
            onBack={() => setStep('input')}
          />
        )}
        </div>
      </div>
    </>
  );
}