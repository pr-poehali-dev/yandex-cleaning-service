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
  removedPhrases?: Phrase[];
  isMinusWord?: boolean;
  minusTerm?: string;
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
  regions?: string[];
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
  onSaveChanges,
  regions = []
}: ResultsStepProps) {
  const initialClusters = propsClusters.map((c, idx) => ({
    ...c,
    bgColor: CLUSTER_BG_COLORS[idx % CLUSTER_BG_COLORS.length],
    searchText: '',
    hovering: false
  }));
  
  const [clusters, setClusters] = useState(initialClusters);
  const [minusWords, setMinusWords] = useState<Phrase[]>(
    propsMinusWords.filter(p => p.phrase && p.phrase.trim() !== '')
  );
  const [minusSearchText, setMinusSearchText] = useState('');
  const [editingMinusIndex, setEditingMinusIndex] = useState<number | null>(null);
  const [editingMinusText, setEditingMinusText] = useState('');
  const [draggedCluster, setDraggedCluster] = useState<number | null>(null);
  const [draggedPhrase, setDraggedPhrase] = useState<{clusterIdx: number, phraseIdx: number} | null>(null);
  const [excludeRedPhrases, setExcludeRedPhrases] = useState(true);
  const [includeFrequency, setIncludeFrequency] = useState(false);
  const [quickMinusMode, setQuickMinusMode] = useState(true);
  const [useWordForms, setUseWordForms] = useState(true);
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
    setMinusWords(propsMinusWords.filter(p => p.phrase && p.phrase.trim() !== ''));
  }, [clustersDataKey]);

  const matchesSearch = (phrase: string, searchTerm: string): boolean => {
    if (!searchTerm.trim()) return false;
    return matchWithYandexOperators(phrase, searchTerm);
  };

  const matchWithYandexOperators = (phrase: string, query: string): boolean => {
    const phraseLower = phrase.toLowerCase();
    const queryLower = query.toLowerCase().trim();

    // Оператор "кавычки" - фиксирует количество и набор слов (но НЕ порядок)
    if (queryLower.startsWith('"') && queryLower.endsWith('"')) {
      const quotedText = queryLower.slice(1, -1).trim();
      const queryWords = quotedText.split(/\s+/).filter(w => w.length > 0);
      const phraseWords = phraseLower.split(/\s+/).filter(w => w.length > 0);
      
      // Проверяем что ВСЕ слова из запроса есть в фразе (в любом порядке)
      const allWordsPresent = queryWords.every(qw => phraseWords.includes(qw));
      // Проверяем что в фразе ТОЛЬКО эти слова (без лишних)
      const noExtraWords = phraseWords.every(pw => queryWords.includes(pw));
      
      return allWordsPresent && noExtraWords;
    }

    // Оператор [квадратные скобки] - фиксирует СТРОГИЙ порядок слов
    if (queryLower.startsWith('[') && queryLower.endsWith(']')) {
      const bracketText = queryLower.slice(1, -1).trim();
      const queryWords = bracketText.split(/\s+/).filter(w => w.length > 0);
      const phraseWords = phraseLower.split(/\s+/).filter(w => w.length > 0);
      
      // Ищем последовательность слов в строгом порядке
      for (let i = 0; i <= phraseWords.length - queryWords.length; i++) {
        let match = true;
        for (let j = 0; j < queryWords.length; j++) {
          if (phraseWords[i + j] !== queryWords[j]) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
      return false;
    }

    // Оператор ! - фиксирует ТОЧНУЮ словоформу
    const exactFormMatches = queryLower.matchAll(/!([а-яёa-z]+)/gi);
    const exactWords = Array.from(exactFormMatches, m => m[1].toLowerCase());
    
    if (exactWords.length > 0) {
      const phraseWords = phraseLower.split(/\s+/).filter(w => w.length > 0);
      
      // Все слова с ! должны быть в ТОЧНОЙ форме
      for (const exactWord of exactWords) {
        if (!phraseWords.includes(exactWord)) {
          return false;
        }
      }
      
      // Проверяем остальные слова (без оператора !)
      const queryWithoutExact = queryLower.replace(/!([а-яёa-z]+)/gi, '$1');
      const remainingWords = queryWithoutExact.split(/\s+/).filter(w => w.length > 0 && !w.startsWith('!'));
      
      return remainingWords.every(word => phraseLower.includes(word));
    }

    // Оператор + - фиксирует предлоги/служебные слова
    const stopWordMatches = queryLower.matchAll(/\+([а-яёa-z]+)/gi);
    const stopWords = Array.from(stopWordMatches, m => m[1].toLowerCase());
    
    if (stopWords.length > 0) {
      const phraseWords = phraseLower.split(/\s+/).filter(w => w.length > 0);
      
      // Все слова с + должны присутствовать
      for (const stopWord of stopWords) {
        if (!phraseWords.includes(stopWord)) {
          return false;
        }
      }
      
      // Проверяем остальные слова
      const queryWithoutStop = queryLower.replace(/\+([а-яёa-z]+)/gi, '$1');
      const remainingWords = queryWithoutStop.split(/\s+/).filter(w => w.length > 0 && !w.startsWith('+'));
      
      return remainingWords.every(word => phraseLower.includes(word));
    }

    // Обычный поиск - все слова должны присутствовать (любые словоформы)
    const words = queryLower.split(/\s+/).filter(w => w.length > 0);
    return words.every(word => phraseLower.includes(word));
  };

  const sortPhrases = (phrases: Phrase[]) => {
    return phrases.sort((a, b) => {
      const aIsMinusConfirmed = a.isMinusWord && a.minusTerm === undefined;
      const bIsMinusConfirmed = b.isMinusWord && b.minusTerm === undefined;
      
      if (aIsMinusConfirmed && !bIsMinusConfirmed) return 1;
      if (!aIsMinusConfirmed && bIsMinusConfirmed) return -1;
      
      return b.count - a.count;
    });
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
        const matches = matchWithYandexOperators(p.phrase, searchTerm);
        const alreadyInTarget = ownPhrases.some(own => own.phrase === p.phrase);
        
        if (matches && !alreadyInTarget) {
          tempPhrases.push({
            ...p,
            sourceCluster: otherCluster.name,
            sourceColor: otherCluster.bgColor,
            isTemporary: true
          });
        }
      });
    });
    
    return sortPhrases(tempPhrases);
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
        matchWithYandexOperators(p.phrase, searchTerm)
      );

      if (matchingPhrases.length > 0) {
        cluster.phrases = cluster.phrases.filter(p =>
          !matchWithYandexOperators(p.phrase, searchTerm)
        );
        
        const phrasesWithSource = matchingPhrases.map(p => ({
          ...p,
          sourceCluster: p.sourceCluster || cluster.name,
          sourceColor: p.sourceColor || cluster.bgColor,
          isTemporary: false
        }));
        
        movedPhrases.push(...phrasesWithSource);
      }
    }

    if (movedPhrases.length > 0) {
      targetCluster.phrases = sortPhrases([...targetCluster.phrases, ...movedPhrases]);
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
    
    const searchTerm = value.toLowerCase().trim();
    if (!searchTerm) {
      // При очистке поиска снимаем всю временную подсветку
      const newClusters = clusters.map(cluster => ({
        ...cluster,
        phrases: sortPhrases(cluster.phrases.map(p => ({
          ...p,
          isMinusWord: false,
          minusTerm: undefined
        })))
      }));
      setClusters(newClusters);
      return;
    }
    
    // При вводе — пересчитываем совпадения для всех фраз
    const newClusters = clusters.map(cluster => {
      const updatedPhrases = cluster.phrases.map(p => {
        const matches = matchesWordForm(p.phrase, searchTerm);
        
        // Всегда обновляем состояние фразы на основе текущего совпадения
        return {
          ...p,
          isMinusWord: matches,
          minusTerm: matches ? searchTerm : undefined
        };
      });
      
      return {
        ...cluster,
        phrases: updatedPhrases
      };
    });
    
    setClusters(newClusters);
  };

  const handleConfirmMinusSearch = async () => {
    const searchTerm = minusSearchText.toLowerCase().trim();
    if (!searchTerm) return;

    // Проверка дубля
    const isDuplicate = minusWords.some(m => m.phrase.toLowerCase() === searchTerm);
    if (isDuplicate) {
      toast({
        title: '⚠️ Дубль минус-слова',
        description: `"${searchTerm}" уже есть в списке`,
        variant: 'destructive'
      });
      setMinusSearchText('');
      return;
    }

    const affectedPhrases: Phrase[] = [];
    const newClusters = clusters.map(cluster => {
      const updatedPhrases = cluster.phrases.map(p => {
        if (matchesWordForm(p.phrase, searchTerm)) {
          affectedPhrases.push({
            ...p,
            sourceCluster: cluster.name,
            sourceColor: cluster.bgColor
          });
          
          // Закрепляем фразу как минус-слово (НЕ удаляем!)
          return {
            ...p,
            isMinusWord: true,
            minusTerm: undefined  // undefined = подтверждённое минус-слово
          };
        }
        return p;
      });
      
      return {
        ...cluster,
        phrases: updatedPhrases
      };
    });

    if (affectedPhrases.length > 0) {
      const totalCount = affectedPhrases.reduce((sum, p) => sum + (p.count || 0), 0);
      
      const newMinusWord: Phrase = {
        phrase: searchTerm,
        count: totalCount,
        removedPhrases: affectedPhrases.map(p => ({
          ...p,
          isMinusWord: false,
          minusTerm: undefined
        }))
      };
      
      const newMinusWords = [...minusWords, newMinusWord].sort((a, b) => b.count - a.count);
      setMinusWords(newMinusWords);
      setClusters(newClusters);
      setMinusSearchText('');

      if (onSaveChanges) {
        await onSaveChanges(
          newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
          newMinusWords
        );
      }

      toast({
        title: '🚫 Добавлено в минус-слова',
        description: `${affectedPhrases.length} фраз помечено`
      });
    }
  };

  const getWordRoot = (word: string): string => {
    const w = word.toLowerCase();
    if (w.length <= 3) return w;
    
    const commonEndings = [
      // Причастия
      'ующий', 'ающий', 'ющий', 'ящий', 'вший', 'ший',
      'ующая', 'ающая', 'ющая', 'ящая', 'вшая', 'шая',
      'ующую', 'ающую', 'ющую', 'ящую',
      'ающие', 'ующие', 'ющие', 'ящие', 'вшие', 'шие',
      // Существительные
      'ость', 'ение', 'ание', 'ость', 'ство', 'тель',
      // Глаголы (инфинитив)
      'ать', 'ять', 'еть', 'ить', 'оть', 'уть', 'ти',
      // Глаголы (личные формы)
      'ишь', 'ешь', 'ёшь', 'ишь',
      'ит', 'ет', 'ёт',
      'им', 'ем', 'ём',
      'ите', 'ете', 'ёте',
      'ят', 'ат', 'ут', 'ют',
      'ил', 'ел', 'ёл', 'ал', 'ял',
      'ила', 'ела', 'ёла', 'ала', 'яла',
      'или', 'ели', 'ёли', 'али', 'яли',
      'ило', 'ело', 'ёло', 'ало', 'яло',
      'ишь', 'ешь',
      // Прилагательные
      'ный', 'ная', 'ное', 'ные',
      'ной', 'ную',
      'ая', 'яя', 'ое', 'ее',
      'ый', 'ий', 'ой',
      'ые', 'ие',
      'ого', 'его',
      'ому', 'ему',
      // Множественное число существительных
      'ами', 'ями',
      'ах', 'ях',
      'ов', 'ев', 'ей',
      'ам', 'ям',
      'ом', 'ем', 'им',
      // Возвратные формы
      'ся', 'сь',
      // Короткие окончания (в конце, чтобы не перебивали длинные)
      'у', 'ю', 'а', 'я', 'ы', 'и', 'е', 'о'
    ];
    
    for (const ending of commonEndings) {
      if (w.endsWith(ending) && w.length - ending.length >= 3) {
        return w.slice(0, -ending.length);
      }
    }
    
    return w;
  };

  const matchesWordForm = (phrase: string, targetWord: string): boolean => {
    const targetLower = targetWord.toLowerCase();
    const phraseWords = phrase.toLowerCase().split(/\s+/);
    
    // Минимальная длина поиска — 3 символа (защита от случайных совпадений)
    if (targetLower.length < 3) {
      return phraseWords.some(word => word === targetLower);
    }
    
    return phraseWords.some(word => {
      // 1. Точное совпадение слова
      if (word === targetLower) return true;
      
      // 2. Подстрока внутри слова (для любой части: "упит" найдёт "купить")
      // Слово должно быть НЕ намного длиннее поиска (защита от мусора)
      if (word.includes(targetLower) && word.length <= targetLower.length + 4) {
        return true;
      }
      
      // 3. Совпадение корней (для словоформ: купить → куплю, купил)
      // НО: длины слов должны быть примерно одинаковые (защита от мусора)
      const wordRoot = getWordRoot(word);
      const targetRoot = getWordRoot(targetLower);
      
      if (wordRoot === targetRoot && 
          wordRoot.length >= 3 && 
          Math.abs(word.length - targetLower.length) <= 3) {
        return true;
      }
      
      return false;
    });
  };

  const addQuickMinusWord = async (word: string) => {
    const searchTerm = word.toLowerCase().trim();
    if (!searchTerm) return;

    // Проверка дубля
    const isDuplicate = minusWords.some(m => m.phrase.toLowerCase() === searchTerm);
    if (isDuplicate) {
      toast({
        title: '⚠️ Дубль минус-слова',
        description: `"${searchTerm}" уже есть в списке`,
        variant: 'destructive'
      });
      return;
    }

    const affectedPhrases: Phrase[] = [];
    
    // Сохраняем ВСЕ существующие минус-метки
    const updatedClusters = clusters.map(cluster => {
      const updatedPhrases = cluster.phrases.map(p => {
        // Если фраза УЖЕ помечена как минус — оставляем как есть
        if (p.isMinusWord) {
          return p;
        }
        
        // Если фраза совпадает с новым минус-словом — помечаем
        if (matchesWordForm(p.phrase, searchTerm)) {
          affectedPhrases.push(p);
          return { ...p, isMinusWord: true, minusTerm: searchTerm };
        }
        
        // Иначе оставляем без изменений
        return p;
      });
      
      return {
        ...cluster,
        phrases: updatedPhrases
      };
    });

    if (affectedPhrases.length > 0) {
      const totalCount = affectedPhrases.reduce((sum, p) => sum + (p.count || 0), 0);
      
      const newMinusWord: Phrase = {
        phrase: searchTerm,
        count: totalCount,
        removedPhrases: affectedPhrases.map(p => ({
          ...p,
          isMinusWord: false,
          minusTerm: undefined
        }))
      };
      
      const newMinusWords = [...minusWords, newMinusWord].sort((a, b) => b.count - a.count);
      
      setClusters(updatedClusters);
      setMinusWords(newMinusWords);

      if (onSaveChanges) {
        await onSaveChanges(
          updatedClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
          newMinusWords
        );
      }

      toast({
        title: '🚫 Добавлено в минус-слова',
        description: `${affectedPhrases.length} фраз помечено`
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
    const cluster = clusters[clusterIndex];
    
    if (cluster.name === 'Минус-фразы' || cluster.intent === 'minus') {
      toast({
        title: '⚠️ Нельзя удалить',
        description: 'Кластер минус-фраз всегда должен существовать',
        variant: 'destructive'
      });
      return;
    }
    
    if (!confirm(`Удалить кластер "${cluster.name}"?`)) return;

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
    const text = phrases
      .map(p => includeFrequency ? `${p.phrase}\t${p.count}` : p.phrase)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${phrases.length} фраз${includeFrequency ? ' с частотностью' : ''}` });
  };

  const removeMinusWord = async (minusIndex: number) => {
    const minusWord = minusWords[minusIndex];
    const newMinusWords = minusWords.filter((_, idx) => idx !== minusIndex);
    
    const phrasesToUnmark = minusWord.removedPhrases || [];
    const phraseTexts = new Set(phrasesToUnmark.map(p => p.phrase.toLowerCase()));
    
    const newClusters = clusters.map(cluster => {
      const updatedPhrases = cluster.phrases.map(p => {
        // Снимаем зачёркивание с фраз которые были в этом минус-слове
        if (phraseTexts.has(p.phrase.toLowerCase()) && p.isMinusWord && p.minusTerm === undefined) {
          return {
            ...p,
            isMinusWord: false,
            minusTerm: undefined
          };
        }
        return p;
      });
      
      return {
        ...cluster,
        phrases: sortPhrases(updatedPhrases)
      };
    });
    
    setClusters(newClusters);
    setMinusWords(newMinusWords);
    
    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        newMinusWords
      );
    }
    
    toast({
      title: '↩️ Фразы восстановлены',
      description: `Восстановлено ${phrasesToUnmark.length} фраз`
    });
  };

  const startEditingMinusWord = (index: number) => {
    setEditingMinusIndex(index);
    setEditingMinusText(minusWords[index].phrase);
  };

  const saveEditingMinusWord = async () => {
    if (editingMinusIndex === null) return;
    
    const newPhrase = editingMinusText.trim();
    if (!newPhrase) {
      toast({
        title: '⚠️ Ошибка',
        description: 'Минус-фраза не может быть пустой',
        variant: 'destructive'
      });
      return;
    }

    const newMinusWords = [...minusWords];
    newMinusWords[editingMinusIndex] = {
      ...newMinusWords[editingMinusIndex],
      phrase: newPhrase
    };
    
    setMinusWords(newMinusWords);
    setEditingMinusIndex(null);
    setEditingMinusText('');

    if (onSaveChanges) {
      await onSaveChanges(
        clusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        newMinusWords
      );
    }

    toast({
      title: '✅ Сохранено',
      description: 'Минус-фраза обновлена'
    });
  };

  const cancelEditingMinusWord = () => {
    setEditingMinusIndex(null);
    setEditingMinusText('');
  };

  const removeDuplicates = async () => {
    const normalizePhrase = (phrase: string) => {
      return phrase.toLowerCase().split(/\s+/).sort().join(' ');
    };

    let removedCount = 0;
    const newClusters = clusters.map(cluster => {
      const seen = new Set<string>();
      const uniquePhrases: Phrase[] = [];

      cluster.phrases.forEach(p => {
        const normalized = normalizePhrase(p.phrase);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniquePhrases.push(p);
        } else {
          removedCount++;
        }
      });

      return {
        ...cluster,
        phrases: uniquePhrases
      };
    });

    setClusters(newClusters);

    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
    }

    toast({
      title: '🧹 Дубли удалены',
      description: `Удалено дублей: ${removedCount}`
    });
  };

  const copyMinusPhrases = () => {
    const text = minusWords.map(p => p.phrase).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Скопировано', description: `${minusWords.length} минус-фраз` });
  };

  const exportToExcel = () => {
    const clusterData = clusters.map(cluster => {
      const phrasesToExport = cluster.phrases.filter(p => {
        if (excludeRedPhrases && p.isMinusWord) return false;
        return true;
      });
      
      return {
        name: cluster.name,
        phrases: phrasesToExport
      };
    });

    const maxRows = Math.max(...clusterData.map(c => c.phrases.length));
    
    let csv = '';
    let totalExported = 0;

    const headerRow = clusterData.map(c => {
      if (includeFrequency) {
        return `${c.name}\tЧастотность`;
      }
      return c.name;
    }).join('\t');
    csv += headerRow + '\n';

    for (let row = 0; row < maxRows; row++) {
      const rowData = clusterData.map(cluster => {
        const phrase = cluster.phrases[row];
        if (!phrase) {
          return includeFrequency ? '\t' : '';
        }
        
        totalExported++;
        
        if (includeFrequency) {
          let text = `${phrase.phrase}\t${phrase.count}`;
          if (phrase.isMinusWord && !excludeRedPhrases) {
            text = `${phrase.phrase} [МИНУС]\t${phrase.count}`;
          }
          return text;
        } else {
          if (phrase.isMinusWord && !excludeRedPhrases) {
            return `${phrase.phrase} [МИНУС]`;
          }
          return phrase.phrase;
        }
      });
      
      csv += rowData.join('\t') + '\n';
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `кластеры_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ 
      title: '📊 Экспорт завершен',
      description: `Выгружено ${totalExported} фраз из ${clusters.length} кластеров`
    });
  };

  const totalPhrases = clusters.reduce((sum, c) => sum + c.phrases.length, 0) + minusWords.length;

  const handleClusterDragStart = (clusterIdx: number) => {
    setDraggedCluster(clusterIdx);
  };

  const handleClusterDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedCluster === null || draggedCluster === targetIdx) return;
  };

  const handleClusterDrop = async (targetIdx: number) => {
    if (draggedCluster === null || draggedCluster === targetIdx) {
      setDraggedCluster(null);
      return;
    }

    const newClusters = [...clusters];
    const [movedCluster] = newClusters.splice(draggedCluster, 1);
    newClusters.splice(targetIdx, 0, movedCluster);
    
    setClusters(newClusters);
    setDraggedCluster(null);

    console.log('🔄 Cluster moved, saving...', { onSaveChanges: !!onSaveChanges });
    
    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
      console.log('✅ Cluster move saved to API');
    } else {
      console.warn('⚠️ onSaveChanges not provided');
    }

    toast({
      title: '✅ Кластер перемещён',
      description: 'Позиция сохранена'
    });
  };

  const handlePhraseDragStart = (clusterIdx: number, phraseIdx: number) => {
    setDraggedPhrase({ clusterIdx, phraseIdx });
  };

  const handlePhraseDrop = async (targetClusterIdx: number) => {
    if (!draggedPhrase) return;
    
    const { clusterIdx: sourceClusterIdx, phraseIdx } = draggedPhrase;
    
    if (sourceClusterIdx === targetClusterIdx) {
      setDraggedPhrase(null);
      return;
    }

    const newClusters = [...clusters];
    const sourceCluster = newClusters[sourceClusterIdx];
    const targetCluster = newClusters[targetClusterIdx];
    
    const [movedPhrase] = sourceCluster.phrases.splice(phraseIdx, 1);
    
    movedPhrase.sourceCluster = movedPhrase.sourceCluster || sourceCluster.name;
    movedPhrase.sourceColor = movedPhrase.sourceColor || sourceCluster.bgColor;
    
    targetCluster.phrases.push(movedPhrase);
    targetCluster.phrases = sortPhrases(targetCluster.phrases);
    
    setClusters(newClusters);
    setDraggedPhrase(null);

    if (onSaveChanges) {
      await onSaveChanges(
        newClusters.map(c => ({ name: c.name, intent: c.intent, color: c.color, icon: c.icon, phrases: c.phrases })),
        minusWords
      );
    }

    toast({
      title: '✅ Фраза перемещена',
      description: `→ "${targetCluster.name}"`
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-shrink-0 border-b bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Результаты кластеризации</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm bg-white rounded-lg px-4 py-2 border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickMinusMode}
                    onChange={(e) => setQuickMinusMode(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">Режим быстрых минус-слов</span>
                </label>
                <div className="h-4 w-px bg-gray-300" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useWordForms}
                    onChange={(e) => setUseWordForms(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">Учитывать словоформы</span>
                </label>
                <div className="h-4 w-px bg-gray-300" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeRedPhrases}
                    onChange={(e) => setExcludeRedPhrases(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">Не выгружать красные фразы</span>
                </label>
                <div className="h-4 w-px bg-gray-300" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFrequency}
                    onChange={(e) => setIncludeFrequency(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">С частотностью</span>
                </label>
              </div>
              <Button onClick={removeDuplicates} size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700">
                <Icon name="Trash2" size={16} />
                Удалить дубли
              </Button>
              <Button onClick={exportToExcel} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Icon name="FileSpreadsheet" size={16} />
                Выгрузить в Excel
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Key" size={16} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Всего ключей</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{totalPhrases.toLocaleString()}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg px-4 py-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Folder" size={16} className="text-purple-600" />
                <span className="text-xs font-medium text-purple-600">Кластеров</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{clusters.length}</div>
            </div>
            
            <div className="bg-red-50 rounded-lg px-4 py-3 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Ban" size={16} className="text-red-600" />
                <span className="text-xs font-medium text-red-600">Минус-слов</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{minusWords.length}</div>
            </div>
          </div>
          
          {regions.length > 0 && (
            <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg px-4 py-3 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Icon name="MapPin" size={16} className="text-emerald-600" />
                <span className="font-semibold text-emerald-800">Регионы:</span>
                <span className="text-emerald-700 font-medium">{regions.join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-visible">
        <div className="flex min-h-[calc(100vh-200px)] px-6 py-4 pb-32">
          {clusters.map((cluster, idx) => (
            <div
              key={idx}
              onDragOver={(e) => handleClusterDragOver(e, idx)}
              onDrop={() => handleClusterDrop(idx)}
              className={`flex-shrink-0 border-r border-gray-300 flex flex-col group relative ${draggedCluster === idx ? 'opacity-50' : ''}`}
              style={{ 
                width: '280px',
                backgroundColor: cluster.bgColor,
                maxHeight: 'calc(100vh - 250px)'
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
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleClusterDragStart(idx);
                    }}
                    className="cursor-move"
                  >
                    <Icon name="GripVertical" size={14} className="text-gray-400 flex-shrink-0" />
                  </div>
                  <Icon name={cluster.icon as any} size={18} className="text-gray-700" />
                  <Input
                    value={cluster.name}
                    onChange={(e) => renameCluster(idx, e.target.value)}
                    className="font-semibold text-sm h-7 border-transparent hover:border-gray-300 focus:border-gray-400 bg-transparent flex-1"
                  />
                </div>

                <div className="flex gap-1.5 mb-2">
                  <div className="flex-1 relative group">
                    <Input
                      placeholder='Поиск: "фраза" [точно] !форма +предлог'
                      value={cluster.searchText}
                      onChange={(e) => handleSearchChange(idx, e.target.value)}
                      className="h-8 text-sm bg-white border-gray-300 w-full"
                      title='Операторы Яндекс.Директ:
"купить квартиру" - порядок слов
[купить квартиру] - строго подряд
!купить - точная форма
+в - обязательный предлог'
                    />
                  </div>
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

              <div 
                className="flex-1 overflow-y-auto"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  handlePhraseDrop(idx);
                }}
              >
                {getFilteredPhrases(idx, cluster.searchText).map((phrase, pIdx) => {
                  const actualPhraseIdx = cluster.phrases.findIndex(p => p.phrase === phrase.phrase);
                  return (
                    <div
                      key={pIdx}
                      draggable={!phrase.isTemporary && !phrase.isMinusWord}
                      onDragStart={() => handlePhraseDragStart(idx, actualPhraseIdx)}
                      className={`px-3 py-2 border-b border-gray-200 hover:bg-white/40 group/phrase ${phrase.isMinusWord ? 'bg-red-50 border-l-4 border-l-red-500' : ''} ${!phrase.isTemporary && !phrase.isMinusWord ? 'cursor-move' : ''}`}
                      style={!phrase.isMinusWord && phrase.sourceColor ? {
                        backgroundColor: phrase.sourceColor,
                        borderLeft: `3px solid ${phrase.sourceColor}`
                      } : {}}
                    >
                      <div className="flex items-center gap-2">
                        {!phrase.isTemporary && !phrase.isMinusWord && (
                          <Icon name="GripVertical" size={12} className="text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm leading-snug mb-1 ${phrase.isMinusWord ? 'text-red-700 line-through' : 'text-gray-800'}`}>
                            {quickMinusMode && !phrase.isMinusWord ? (
                              phrase.phrase.split(' ').map((word, wIdx) => (
                                <span
                                  key={wIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addQuickMinusWord(word);
                                  }}
                                  className="hover:bg-red-100 hover:text-red-700 rounded px-0.5 cursor-pointer transition-colors"
                                >
                                  {word}{wIdx < phrase.phrase.split(' ').length - 1 ? ' ' : ''}
                                </span>
                              ))
                            ) : (
                              phrase.phrase
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`text-xs font-mono ${phrase.isMinusWord ? 'text-red-600' : 'text-gray-500'}`}>
                              {phrase.count.toLocaleString()}
                            </div>
                            {phrase.sourceCluster && !phrase.isMinusWord && (
                              <div className="text-xs text-gray-600 italic">
                                из "{phrase.sourceCluster}"
                              </div>
                            )}
                            {phrase.isMinusWord && (
                              <div className="text-xs text-red-600 italic">
                                минус-слово
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
            className="flex-shrink-0 border-r border-gray-300 flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => addNewCluster(clusters.length - 1)}
            style={{ 
              width: '280px',
              backgroundColor: '#F5F5F5',
              maxHeight: 'calc(100vh - 250px)'
            }}
          >
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mb-4">
                <Icon name="Plus" size={32} className="text-gray-600" />
              </div>
              <div className="text-gray-600 font-medium text-sm mb-1">Создать кластер</div>
              <div className="text-gray-400 text-xs">Нажмите, чтобы добавить</div>
            </div>
          </div>

          <div
            className="flex-shrink-0 border-r border-gray-300 flex flex-col"
            style={{ 
              width: '280px',
              backgroundColor: '#FFE8E8',
              maxHeight: 'calc(100vh - 250px)'
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
                className="w-full text-xs h-7 hover:bg-white/80 mb-2"
              >
                <Icon name="Copy" size={12} className="mr-1.5" />
                Копировать
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {minusWords.map((phrase, pIdx) => (
                <div
                  key={pIdx}
                  className="px-3 py-2 border-b border-gray-200 hover:bg-white/40 group/minus"
                >
                  {editingMinusIndex === pIdx ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingMinusText}
                        onChange={(e) => setEditingMinusText(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditingMinusWord();
                          if (e.key === 'Escape') cancelEditingMinusWord();
                        }}
                      />
                      <button
                        onClick={saveEditingMinusWord}
                        className="text-green-700 hover:text-green-900"
                      >
                        <Icon name="Check" size={16} />
                      </button>
                      <button
                        onClick={cancelEditingMinusWord}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Icon name="X" size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm text-gray-800 leading-snug mb-1">
                          {phrase.phrase}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {phrase.count > 0 ? phrase.count.toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover/minus:opacity-100">
                        <button
                          onClick={() => startEditingMinusWord(pIdx)}
                          className="text-blue-700 hover:text-blue-900 flex-shrink-0"
                        >
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button
                          onClick={() => removeMinusWord(pIdx)}
                          className="text-red-700 hover:text-red-900 flex-shrink-0"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}