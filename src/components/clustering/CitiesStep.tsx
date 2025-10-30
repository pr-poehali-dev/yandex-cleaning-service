import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { City } from '@/data/russian-cities';
import { toast } from 'sonner';

const OAUTH_API = 'https://functions.poehali.dev/7670577f-a6d7-4122-b6ca-d0c77f43e21e';
const REGIONS_API = 'https://functions.poehali.dev/a0ab9dc8-671f-45ed-a5a9-a17f5e7fd34d';

interface CitiesStepProps {
  selectedCities: City[];
  citySearch: string;
  setCitySearch: (search: string) => void;
  addCity: (city: City) => void;
  removeCity: (cityId: number) => void;
  onNext: () => void;
  onBack: () => void;
  onWordstatCollect?: () => void;
  hasManualKeywords?: boolean;
}

export default function CitiesStep({
  selectedCities,
  citySearch,
  setCitySearch,
  addCity,
  removeCity,
  onNext,
  onBack,
  onWordstatCollect,
  hasManualKeywords = false
}: CitiesStepProps) {
  const [regions, setRegions] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('yandex_wordstat_token');
    setIsAuthorized(!!token);
    
    if (token) {
      loadRegions();
    }
  }, []);

  const handleAuthorize = async () => {
    try {
      const response = await fetch(`${OAUTH_API}?action=init`);
      const data = await response.json();
      
      localStorage.setItem('oauth_return_url', window.location.pathname);
      window.location.href = data.auth_url;
    } catch (error) {
      toast.error('Ошибка при инициализации авторизации');
    }
  };

  const loadRegions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(REGIONS_API);
      const data = await response.json();
      
      if (data.regions) {
        setRegions(data.regions);
      }
    } catch (error) {
      toast.error('Ошибка при загрузке регионов');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCities = regions.filter(city => 
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
        {!isAuthorized ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Icon name="Lock" className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Требуется авторизация
            </h3>
            <p className="text-sm text-yellow-700 mb-4">
              Для получения списка регионов необходимо авторизоваться через Яндекс
            </p>
            <Button
              onClick={handleAuthorize}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Icon name="LogIn" className="mr-2 h-4 w-4" />
              Авторизоваться через Яндекс
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
            <p className="text-sm text-slate-500">Загрузка регионов...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="city-search" className="text-slate-700">Добавить регион</Label>
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
                  {city.region && (
                    <div className="text-sm text-slate-500">{city.region}</div>
                  )}
                </div>
              ))}
                  {filteredCities.length === 0 && (
                <div className="p-4 text-center text-slate-500">Регион не найден</div>
              )}
            </div>
          )}
        </div>
          </>
        )}

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

        {onWordstatCollect && !hasManualKeywords && selectedCities.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon name="Info" className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Нет ключевых слов?
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  Соберите ключевые фразы из Яндекс Вордстат для выбранных регионов
                </p>
                <Button
                  onClick={onWordstatCollect}
                  variant="outline"
                  className="border-blue-300 hover:bg-blue-100 text-blue-700"
                >
                  <Icon name="Download" className="mr-2 h-4 w-4" />
                  Собрать из Wordstat
                </Button>
              </div>
            </div>
          </div>
        )}

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