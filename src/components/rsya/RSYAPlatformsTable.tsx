import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

interface GoalStats {
  conversions: number;
  conversion_rate: number;
  cost_per_goal: number;
}

interface PlatformStats {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  cpc: number;
  conversions: number;
  conversion_rate: number;
  avg_position: number;
  goals?: Record<string, GoalStats>;
}

interface Platform {
  adgroup_id: string;
  adgroup_name: string;
  status: string;
  network_enabled: boolean;
  stats?: PlatformStats;
  campaign_id?: string;
  campaign_name?: string;
}

interface FilterConfig {
  search: string;
  minImpressions: number;
  maxImpressions: number;
  minClicks: number;
  maxClicks: number;
  minCTR: number;
  maxCTR: number;
  minCost: number;
  maxCost: number;
  minConversions: number;
  maxConversions: number;
  minConversionRate: number;
  maxConversionRate: number;
  status: string[];
  onlyStrange: boolean;
}

interface RSYAPlatformsTableProps {
  platforms: Platform[];
  selectedPlatforms: string[];
  onTogglePlatform: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onMassDisable?: () => void;
}

type SortField = 'name' | 'impressions' | 'clicks' | 'ctr' | 'cost' | 'cpc' | 'conversions' | 'conversion_rate';
type SortOrder = 'asc' | 'desc';

const isStrangeDomain = (name: string) => {
  const strangePatterns = [
    'dsp.', 'vps.', 'cdn-', 'xxx', 'spam', 'bot', 'fake', 'ad-server',
    'promo.click', 'banner-', 'rtb-', 'traffic-', 'click-farm',
    'redirect', 'cloaking', 'doorway', 'parked', 'expired', 'malware', 'phishing', 'scam'
  ];
  return strangePatterns.some(pattern => name.toLowerCase().includes(pattern));
};

export default function RSYAPlatformsTable({
  platforms,
  selectedPlatforms,
  onTogglePlatform,
  onSelectAll,
  onDeselectAll,
  onMassDisable
}: RSYAPlatformsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('cost');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({
    search: '',
    minImpressions: 0,
    maxImpressions: Infinity,
    minClicks: 0,
    maxClicks: Infinity,
    minCTR: 0,
    maxCTR: 100,
    minCost: 0,
    maxCost: Infinity,
    minConversions: 0,
    maxConversions: Infinity,
    minConversionRate: 0,
    maxConversionRate: 100,
    status: [],
    onlyStrange: false
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedPlatforms = useMemo(() => {
    const result = platforms.filter(p => {
      if (searchTerm && !p.adgroup_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      if (filters.onlyStrange && !isStrangeDomain(p.adgroup_name)) {
        return false;
      }
      
      if (filters.status.length > 0 && !filters.status.includes(p.status)) {
        return false;
      }
      
      if (p.stats) {
        if (p.stats.impressions < filters.minImpressions || p.stats.impressions > filters.maxImpressions) return false;
        if (p.stats.clicks < filters.minClicks || p.stats.clicks > filters.maxClicks) return false;
        if (p.stats.ctr < filters.minCTR || p.stats.ctr > filters.maxCTR) return false;
        if (p.stats.cost < filters.minCost || p.stats.cost > filters.maxCost) return false;
        if (p.stats.conversions < filters.minConversions || p.stats.conversions > filters.maxConversions) return false;
        if (p.stats.conversion_rate < filters.minConversionRate || p.stats.conversion_rate > filters.maxConversionRate) return false;
      }
      
      return true;
    });

    result.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;
      
      if (sortField === 'name') {
        aVal = a.adgroup_name;
        bVal = b.adgroup_name;
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (a.stats && b.stats) {
        switch (sortField) {
          case 'impressions': aVal = a.stats.impressions; bVal = b.stats.impressions; break;
          case 'clicks': aVal = a.stats.clicks; bVal = b.stats.clicks; break;
          case 'ctr': aVal = a.stats.ctr; bVal = b.stats.ctr; break;
          case 'cost': aVal = a.stats.cost; bVal = b.stats.cost; break;
          case 'cpc': aVal = a.stats.cpc; bVal = b.stats.cpc; break;
          case 'conversions': aVal = a.stats.conversions; bVal = b.stats.conversions; break;
          case 'conversion_rate': aVal = a.stats.conversion_rate; bVal = b.stats.conversion_rate; break;
        }
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [platforms, searchTerm, sortField, sortOrder, filters]);

  const stats = useMemo(() => {
    const total = filteredAndSortedPlatforms.length;
    const selected = selectedPlatforms.length;
    const strange = filteredAndSortedPlatforms.filter(p => isStrangeDomain(p.adgroup_name)).length;
    
    const totalStats = filteredAndSortedPlatforms.reduce((acc, p) => {
      if (p.stats) {
        acc.impressions += p.stats.impressions;
        acc.clicks += p.stats.clicks;
        acc.cost += p.stats.cost;
        acc.conversions += p.stats.conversions;
      }
      return acc;
    }, { impressions: 0, clicks: 0, cost: 0, conversions: 0 });
    
    const selectedStats = filteredAndSortedPlatforms
      .filter(p => selectedPlatforms.includes(p.adgroup_id))
      .reduce((acc, p) => {
        if (p.stats) {
          acc.impressions += p.stats.impressions;
          acc.clicks += p.stats.clicks;
          acc.cost += p.stats.cost;
          acc.conversions += p.stats.conversions;
        }
        return acc;
      }, { impressions: 0, clicks: 0, cost: 0, conversions: 0 });
    
    return { total, selected, strange, totalStats, selectedStats };
  }, [filteredAndSortedPlatforms, selectedPlatforms]);

  const allSelected = filteredAndSortedPlatforms.length > 0 && 
    filteredAndSortedPlatforms.every(p => selectedPlatforms.includes(p.adgroup_id));

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {children}
      {sortField === field && (
        <Icon name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'} className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return (
    <Card className="shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon name="Table" className="h-6 w-6 text-blue-600" />
            Площадки РСЯ
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Icon name="Filter" className="h-4 w-4" />
              {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Всего площадок</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Выбрано</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.selected}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Подозрительных</div>
            <div className="text-2xl font-bold text-orange-600">{stats.strange}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Общий расход</div>
            <div className="text-xl font-bold text-slate-900">{stats.totalStats.cost.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 mb-1">К отключению</div>
            <div className="text-xl font-bold text-red-600">{stats.selectedStats.cost.toLocaleString('ru-RU')} ₽</div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Поиск площадок..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            variant="outline"
            size="sm"
          >
            {allSelected ? 'Снять все' : 'Выбрать все'}
          </Button>
          <Button
            onClick={() => {
              const strangeIds = filteredAndSortedPlatforms
                .filter(p => isStrangeDomain(p.adgroup_name))
                .map(p => p.adgroup_id);
              strangeIds.forEach(id => {
                if (!selectedPlatforms.includes(id)) {
                  onTogglePlatform(id);
                }
              });
            }}
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <Icon name="AlertTriangle" className="h-4 w-4 mr-1" />
            Выбрать подозрительные
          </Button>
          {selectedPlatforms.length > 0 && onMassDisable && (
            <Button
              onClick={onMassDisable}
              variant="destructive"
              size="sm"
            >
              <Icon name="Ban" className="h-4 w-4 mr-1" />
              Отключить ({selectedPlatforms.length})
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Мин. показы</label>
              <Input
                type="number"
                value={filters.minImpressions || ''}
                onChange={(e) => setFilters({ ...filters, minImpressions: Number(e.target.value) || 0 })}
                placeholder="0"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Мин. клики</label>
              <Input
                type="number"
                value={filters.minClicks || ''}
                onChange={(e) => setFilters({ ...filters, minClicks: Number(e.target.value) || 0 })}
                placeholder="0"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Мин. CTR %</label>
              <Input
                type="number"
                step="0.1"
                value={filters.minCTR || ''}
                onChange={(e) => setFilters({ ...filters, minCTR: Number(e.target.value) || 0 })}
                placeholder="0"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Мин. расход ₽</label>
              <Input
                type="number"
                value={filters.minCost || ''}
                onChange={(e) => setFilters({ ...filters, minCost: Number(e.target.value) || 0 })}
                placeholder="0"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Макс. расход ₽</label>
              <Input
                type="number"
                value={filters.maxCost === Infinity ? '' : filters.maxCost}
                onChange={(e) => setFilters({ ...filters, maxCost: Number(e.target.value) || Infinity })}
                placeholder="∞"
                className="text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.onlyStrange}
                  onCheckedChange={(checked) => setFilters({ ...filters, onlyStrange: !!checked })}
                />
                <span className="text-sm font-medium text-slate-700">Только подозрительные</span>
              </label>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr className="text-xs font-bold text-slate-700 uppercase">
                <th className="px-4 py-3 text-left w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={allSelected ? onDeselectAll : onSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortButton field="name">Площадка</SortButton>
                </th>
                <th className="px-4 py-3 text-left">Кампания</th>
                <th className="px-4 py-3 text-center">Статус</th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="impressions">Показы</SortButton>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="clicks">Клики</SortButton>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="ctr">CTR %</SortButton>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="cost">Расход ₽</SortButton>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="cpc">CPC ₽</SortButton>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="conversions">Конв.</SortButton>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="conversion_rate">CR %</SortButton>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlatforms.map((platform, idx) => {
                const isSelected = selectedPlatforms.includes(platform.adgroup_id);
                const isStrange = isStrangeDomain(platform.adgroup_name);
                
                return (
                  <tr
                    key={platform.adgroup_id}
                    className={`border-b hover:bg-blue-50 transition-colors cursor-pointer ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    } ${isSelected ? 'bg-blue-100 hover:bg-blue-150' : ''}`}
                    onClick={() => onTogglePlatform(platform.adgroup_id)}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onTogglePlatform(platform.adgroup_id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${isStrange ? 'text-orange-700' : 'text-slate-900'}`}>
                          {platform.adgroup_name}
                        </span>
                        {isStrange && (
                          <Icon name="AlertTriangle" className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{platform.campaign_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={platform.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {platform.status}
                      </Badge>
                    </td>
                    {platform.stats ? (
                      <>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                          {platform.stats.impressions.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                          {platform.stats.clicks.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">
                          <span className={
                            platform.stats.ctr > 2 ? 'text-emerald-600' :
                            platform.stats.ctr > 1 ? 'text-blue-600' : 'text-slate-600'
                          }>
                            {platform.stats.ctr}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          {platform.stats.cost.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                          {platform.stats.cpc.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {platform.stats.conversions}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">
                          <span className={
                            platform.stats.conversion_rate > 5 ? 'text-emerald-600' :
                            platform.stats.conversion_rate > 2 ? 'text-blue-600' : 'text-slate-600'
                          }>
                            {platform.stats.conversion_rate}%
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredAndSortedPlatforms.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Icon name="Search" className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div className="font-medium">Площадки не найдены</div>
              <div className="text-sm mt-1">Попробуйте изменить фильтры или поисковый запрос</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
