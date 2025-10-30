import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import DraggablePhrase from './DraggablePhrase';

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

interface ClusterColumnProps {
  cluster: Cluster;
  clusterIndex: number;
  dragOverCluster: string | null;
  onSearchChange: (index: number, value: string) => void;
  onMoveHighlighted: (index: number) => void;
  onDragOver: (e: React.DragEvent, clusterId: string) => void;
  onDrop: (clusterId: string, phraseId: string) => void;
  onDragLeave: () => void;
  onRemovePhrase: (clusterIndex: number, phraseId: string) => void;
  onRenameCluster: (index: number, name: string) => void;
  onDeleteCluster: (index: number) => void;
  onCopyPhrases: (phrases: Phrase[]) => void;
  onDragStart: (phrase: Phrase) => void;
  onDragEnd: (phrase: Phrase) => void;
}

export default function ClusterColumn({
  cluster,
  clusterIndex,
  dragOverCluster,
  onSearchChange,
  onMoveHighlighted,
  onDragOver,
  onDrop,
  onDragLeave,
  onRemovePhrase,
  onRenameCluster,
  onDeleteCluster,
  onCopyPhrases,
  onDragStart,
  onDragEnd
}: ClusterColumnProps) {
  const hasHighlighted = cluster.highlightedPhrases && cluster.highlightedPhrases.size > 0;

  return (
    <div
      key={cluster.id}
      className="flex-shrink-0 w-[320px] border-r border-slate-300 flex flex-col"
      onDragOver={(e) => onDragOver(e, cluster.id)}
      onDrop={(e) => {
        e.preventDefault();
        const phraseId = e.dataTransfer.getData('phraseId');
        onDrop(cluster.id, phraseId);
      }}
      onDragLeave={onDragLeave}
      style={{
        backgroundColor: dragOverCluster === cluster.id ? `${cluster.color}80` : cluster.color
      }}
    >
      <div className="p-3 border-b border-slate-300 bg-white/50">
        <div className="flex items-center justify-between mb-2">
          <Input
            value={cluster.cluster_name}
            onChange={(e) => onRenameCluster(clusterIndex, e.target.value)}
            className="font-semibold text-sm h-7 border-transparent hover:border-slate-300 focus:border-slate-400 bg-transparent"
          />
          <button
            onClick={() => onDeleteCluster(clusterIndex)}
            className="text-red-500 hover:text-red-700 ml-2"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </div>

        <div className="flex gap-1 mb-2">
          <Input
            placeholder="🔍 Поиск..."
            value={cluster.searchText}
            onChange={(e) => onSearchChange(clusterIndex, e.target.value)}
            className="h-7 text-xs flex-1"
          />
          {cluster.searchText && (
            <Button
              size="sm"
              onClick={() => onMoveHighlighted(clusterIndex)}
              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Icon name="Plus" size={14} />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <span>{cluster.phrases.length} фраз</span>
          {hasHighlighted && (
            <span className="text-amber-600 font-semibold">
              {cluster.highlightedPhrases?.size} найдено
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white/30">
        {cluster.phrases.map((phrase) => {
          const isHighlighted = cluster.highlightedPhrases?.has(phrase.phrase);
          return (
            <DraggablePhrase
              key={phrase.id}
              phrase={phrase}
              onRemove={() => onRemovePhrase(clusterIndex, phrase.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isHighlighted={isHighlighted}
              highlightColor={cluster.color}
            />
          );
        })}
      </div>

      <div className="p-2 border-t border-slate-300 bg-white/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopyPhrases(cluster.phrases)}
          className="w-full text-[10px] h-6 hover:bg-white/60"
        >
          <Icon name="Copy" size={10} className="mr-1" />
          Копировать
        </Button>
      </div>
    </div>
  );
}
