import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Filter {
  id: string;
  pattern: string;
}

interface RSYAFiltersManagerProps {
  filters: Filter[];
  newFilter: string;
  setNewFilter: (value: string) => void;
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
}

export default function RSYAFiltersManager({
  filters,
  newFilter,
  setNewFilter,
  onAddFilter,
  onRemoveFilter
}: RSYAFiltersManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Filter" className="h-5 w-5" />
          Фильтры для отключения
        </CardTitle>
        <CardDescription>
          Площадки, содержащие эти подстроки, будут отключены
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            placeholder="Например: dsp, vnp, com."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFilter.trim()) {
                onAddFilter();
              }
            }}
          />
          <Button onClick={onAddFilter} disabled={!newFilter.trim()}>
            <Icon name="Plus" className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="px-3 py-1.5 text-sm flex items-center gap-2"
            >
              <span className="font-mono">{filter.pattern}</span>
              <button
                onClick={() => onRemoveFilter(filter.id)}
                className="hover:text-destructive"
              >
                <Icon name="X" className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
