import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AppSidebar from '@/components/layout/AppSidebar';
import ClusteringInputStep from '@/components/clustering/ClusteringInputStep';
import ClusteringResults from '@/components/clustering/ClusteringResults';
import { aiClustersMock, minusWordsMock, type Cluster } from '@/components/clustering/ClusteringMockData';

type Step = 'input' | 'results';

interface SavedState {
  step: Step;
  keywords: string;
  hasResults: boolean;
}

export default function TestClustering() {
  const [step, setStep] = useState<Step>('input');
  const [keywords, setKeywords] = useState('купить квартиру');
  const [loading, setLoading] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [clusters] = useState<Cluster[]>(aiClustersMock);
  const [minusWords] = useState<string[]>(minusWordsMock);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('clustering_state');
    if (saved) {
      try {
        const state: SavedState = JSON.parse(saved);
        if (state.hasResults) {
          setStep('results');
          setKeywords(state.keywords);
          setExpandedClusters(new Set([...clusters.map(c => c.name)]));
        }
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }, [clusters]);

  const saveState = (newStep: Step, newKeywords: string) => {
    const state: SavedState = {
      step: newStep,
      keywords: newKeywords,
      hasResults: newStep === 'results'
    };
    localStorage.setItem('clustering_state', JSON.stringify(state));
  };

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
      saveState('results', keywords);
      toast({ 
        title: 'Готово!', 
        description: `Найдено ${clusters.length} кластеров и ${minusWords.length} минус-слов` 
      });
    }, 2000);
  };

  const handleBack = () => {
    setStep('input');
    saveState('input', keywords);
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-8 ml-64">
        <div className="max-w-[1600px] mx-auto">
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
            onBack={handleBack}
          />
        )}
        </div>
      </div>
    </>
  );
}