import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { RUSSIAN_CITIES, City } from '@/data/russian-cities';

interface CitiesStepProps {
  selectedCities: City[];
  citySearch: string;
  setCitySearch: (search: string) => void;
  addCity: (city: City) => void;
  removeCity: (cityId: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function CitiesStep({
  selectedCities,
  citySearch,
  setCitySearch,
  addCity,
  removeCity,
  onNext,
  onBack
}: CitiesStepProps) {
  const filteredCities = RUSSIAN_CITIES.filter(city => 
    city.name.toLowerCase().includes(citySearch.toLowerCase()) &&
    !selectedCities.find(c => c.id === city.id)
  );

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-br from-slate-50 to-white">
        <CardTitle className="text-2xl text-slate-800">Для каких городов собираем?</CardTitle>
        <CardDescription className="text-slate-500">
          Выберите города, для которых нужно кластеризовать запросы
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="city-search" className="text-slate-700">Добавить город</Label>
          <Input
            id="city-search"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Начните вводить название города..."
            className="border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
          />
          
          {citySearch && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredCities.slice(0, 10).map(city => (
                <div
                  key={city.id}
                  onClick={() => addCity(city)}
                  className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="font-medium text-slate-800">{city.name}</div>
                  <div className="text-sm text-slate-500">{city.region}</div>
                </div>
              ))}
              {filteredCities.length === 0 && (
                <div className="p-4 text-center text-slate-500">Город не найден</div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label className="text-slate-700 mb-2 block">Выбранные города ({selectedCities.length})</Label>
          <div className="flex flex-wrap gap-2">
            {selectedCities.map(city => (
              <Badge 
                key={city.id} 
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5"
              >
                {city.name}
                <button
                  onClick={() => removeCity(city.id)}
                  className="ml-2 hover:text-emerald-900 transition-colors"
                >
                  <Icon name="X" className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {selectedCities.length === 0 && (
            <p className="text-sm text-slate-500 mt-2">Выберите хотя бы один город</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={onBack}
            variant="outline"
            className="flex-1 border-slate-200 hover:bg-slate-50"
          >
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Назад
          </Button>
          <Button 
            onClick={onNext}
            disabled={selectedCities.length === 0}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Далее
            <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
