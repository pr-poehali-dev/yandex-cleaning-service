import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { RUSSIAN_CITIES, City } from '@/data/russian-cities';

interface WordstatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (query: string, cities: City[], mode: string) => void;
  isLoading: boolean;
  selectedCities: City[];
  setSelectedCities: (cities: City[]) => void;
}

export default function WordstatDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  selectedCities,
  setSelectedCities
}: WordstatDialogProps) {
  const [query, setQuery] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [mode, setMode] = useState<'seo' | 'context'>('seo');

  const filteredCities = RUSSIAN_CITIES.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase()) &&
    !selectedCities.find(c => c.id === city.id)
  ).slice(0, 5);

  const addCity = (city: City) => {
    setSelectedCities([...selectedCities, city]);
    setCitySearch('');
  };

  const removeCity = (cityId: number) => {
    setSelectedCities(selectedCities.filter(c => c.id !== cityId));
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    onSubmit(query, selectedCities, mode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">AI сбор ключей</DialogTitle>
          <DialogDescription>
            Введите запрос и выберите регионы для сбора ключевых фраз
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="wordstat-query">Базовый запрос</Label>
            <Input
              id="wordstat-query"
              placeholder="Например: купить квартиру"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500">
              Введите основной запрос, по которому нужно собрать фразы
            </p>
          </div>

          <div className="space-y-2">
            <Label>Режим сбора</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mode-seo"
                  checked={mode === 'seo'}
                  onCheckedChange={() => setMode('seo')}
                  disabled={isLoading}
                />
                <label
                  htmlFor="mode-seo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  SEO (умная группировка)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mode-context"
                  checked={mode === 'context'}
                  onCheckedChange={() => setMode('context')}
                  disabled={isLoading}
                />
                <label
                  htmlFor="mode-context"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Контекст (все фразы)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Регионы ({selectedCities.length} выбрано)</Label>
            
            {selectedCities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCities.map(city => (
                  <div
                    key={city.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                  >
                    <span className="text-sm text-emerald-700">{city.name}</span>
                    <button
                      onClick={() => removeCity(city.id)}
                      className="text-emerald-600 hover:text-emerald-800"
                      disabled={isLoading}
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Input
              placeholder="Поиск города..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              disabled={isLoading}
            />

            {citySearch && filteredCities.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {filteredCities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => addCity(city)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                    disabled={isLoading}
                  >
                    <span className="text-sm">{city.name}</span>
                    <Icon name="Plus" size={16} className="text-emerald-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || selectedCities.length === 0 || isLoading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {isLoading ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                  Собираем фразы...
                </>
              ) : (
                <>
                  <Icon name="Search" className="mr-2 h-4 w-4" />
                  Собрать фразы
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}