import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface ClusterNamesStepProps {
  clusterNames: string[];
  onClusterNamesChange: (names: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function ClusterNamesStep({
  clusterNames,
  onClusterNamesChange,
  onNext,
  onBack,
  isLoading
}: ClusterNamesStepProps) {
  const [names, setNames] = useState<string[]>(clusterNames);

  const handleNameChange = (index: number, value: string) => {
    const updated = [...names];
    updated[index] = value;
    setNames(updated);
    onClusterNamesChange(updated);
  };

  const handleAddCluster = () => {
    const updated = [...names, `Кластер ${names.length + 1}`];
    setNames(updated);
    onClusterNamesChange(updated);
  };

  const handleRemoveCluster = (index: number) => {
    const updated = names.filter((_, i) => i !== index);
    setNames(updated);
    onClusterNamesChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Названия кластеров</h2>
        <p className="text-slate-600">
          OpenAI предложил названия для ваших кластеров. Отредактируйте их при необходимости
        </p>
      </div>

      <div className="space-y-3">
        {names.map((name, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                {index + 1}
              </div>
              <Input
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder="Название кластера"
                className="flex-1"
              />
              {names.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCluster(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Icon name="Trash2" size={18} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={handleAddCluster}
        className="w-full"
      >
        <Icon name="Plus" size={18} />
        <span className="ml-2">Добавить кластер</span>
      </Button>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <Icon name="ArrowLeft" size={18} />
          <span className="ml-2">Назад</span>
        </Button>
        <Button
          onClick={onNext}
          disabled={isLoading || names.length === 0 || names.some(n => !n.trim())}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600"
        >
          {isLoading ? (
            <>
              <Icon name="Loader2" size={18} className="animate-spin" />
              <span className="ml-2">Обработка...</span>
            </>
          ) : (
            <>
              <span>Продолжить</span>
              <Icon name="ArrowRight" size={18} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
