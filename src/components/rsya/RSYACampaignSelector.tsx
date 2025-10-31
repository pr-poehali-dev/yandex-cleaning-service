import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

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
}

interface Goal {
  id: string;
  name: string;
  type: string;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  platforms?: Platform[];
  goals?: Goal[];
}

interface RSYACampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaigns: string[];
  onToggleCampaign: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedGoal?: string;
  onSelectGoal?: (goalId: string) => void;
}

export default function RSYACampaignSelector({
  campaigns,
  selectedCampaigns,
  onToggleCampaign,
  onSelectAll,
  onDeselectAll,
  selectedGoal = 'all',
  onSelectGoal
}: RSYACampaignSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'platforms' | 'status'>('name');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  
  const allGoals = campaigns.flatMap(c => c.goals || []);
  const uniqueGoals = Array.from(new Map(allGoals.map(g => [g.id, g])).values());
  const allSelected = campaigns.length > 0 && selectedCampaigns.length === campaigns.length;

  const filteredCampaigns = campaigns
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'platforms') return (b.platforms?.length || 0) - (a.platforms?.length || 0);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  const toggleExpanded = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
    }
    setExpandedCampaigns(newExpanded);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icon name="Target" className="h-6 w-6 text-blue-600" />
              Кампании РСЯ
            </CardTitle>
            <CardDescription className="mt-1">
              Выбрано: <span className="font-semibold text-blue-600">{selectedCampaigns.length}</span> из {campaigns.length}
            </CardDescription>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSelectAll}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm hover:shadow"
            >
              Выбрать все
            </button>
            <button
              onClick={onDeselectAll}
              className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-all"
            >
              Снять все
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Поиск кампаний..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50 transition-colors"
          >
            <option value="name">По названию</option>
            <option value="platforms">По площадкам</option>
            <option value="status">По статусу</option>
          </select>
        </div>
        
        {uniqueGoals.length > 0 && onSelectGoal && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="Filter" className="h-4 w-4 text-slate-600" />
              <div className="text-sm font-semibold text-slate-700">Фильтр по целям</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectGoal('all')}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-sm ${
                  selectedGoal === 'all'
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon name="Globe" className="h-3.5 w-3.5" />
                  Все площадки
                </div>
              </button>
              {uniqueGoals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => onSelectGoal(goal.id)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-sm ${
                    selectedGoal === goal.id
                      ? 'bg-emerald-600 text-white shadow-md scale-105'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon name="Target" className="h-3.5 w-3.5" />
                    {goal.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Icon name="Search" className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div className="font-medium">Кампании не найдены</div>
              <div className="text-sm mt-1">Попробуйте изменить поисковый запрос</div>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => {
              const isExpanded = expandedCampaigns.has(campaign.id);
              const platformCount = campaign.platforms?.length || 0;
              
              return (
                <div
                  key={campaign.id}
                  className="border-2 border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all hover:shadow-md"
                >
                  <div
                    className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onToggleCampaign(campaign.id)}
                  >
                    <Checkbox
                      checked={selectedCampaigns.includes(campaign.id)}
                      onCheckedChange={() => onToggleCampaign(campaign.id)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate text-base">
                        {campaign.name}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">ID: {campaign.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                        <Icon name="Building2" className="h-3 w-3 mr-1" />
                        {platformCount}
                      </Badge>
                      <Badge
                        variant={campaign.status === 'ON' ? 'default' : 'secondary'}
                        className="text-xs font-semibold"
                      >
                        {campaign.status}
                      </Badge>
                      {platformCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(campaign.id);
                          }}
                          className="ml-2 p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Icon 
                            name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                            className="h-4 w-4 text-slate-600"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && campaign.platforms && campaign.platforms.length > 0 && (
                    <div className="bg-gradient-to-b from-slate-50 to-white border-t-2 border-slate-200">
                      <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
                        <div className="grid grid-cols-8 gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                          <div className="col-span-2 flex items-center gap-1">
                            <Icon name="Globe" className="h-3.5 w-3.5" />
                            Площадка
                          </div>
                          <div className="text-right">Показы</div>
                          <div className="text-right">Клики</div>
                          <div className="text-right">CTR %</div>
                          <div className="text-right">Расход</div>
                          <div className="text-right">CPC</div>
                          <div className="text-right">Конв.</div>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {campaign.platforms.map((platform, idx) => {
                          const goalStats = selectedGoal !== 'all' && platform.stats?.goals?.[selectedGoal];
                          const displayConversions = goalStats ? goalStats.conversions : platform.stats?.conversions;
                          const displayConvRate = goalStats ? goalStats.conversion_rate : platform.stats?.conversion_rate;
                          const displayCostPerGoal = goalStats ? goalStats.cost_per_goal : platform.stats?.cpc;
                          
                          const isStrangeDomain = platform.adgroup_name.includes('dsp.') || 
                                                 platform.adgroup_name.includes('vps.') ||
                                                 platform.adgroup_name.includes('xxx') ||
                                                 platform.adgroup_name.includes('spam') ||
                                                 platform.adgroup_name.includes('bot') ||
                                                 platform.adgroup_name.includes('fake');
                          
                          return (
                            <div 
                              key={platform.adgroup_id} 
                              className={`grid grid-cols-8 gap-3 px-4 py-3 text-xs border-b border-slate-100 hover:bg-blue-50 transition-all ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                              }`}
                            >
                              <div className="col-span-2 flex items-center gap-2">
                                <span className={`font-medium truncate ${isStrangeDomain ? 'text-orange-700' : 'text-slate-900'}`}>
                                  {platform.adgroup_name}
                                </span>
                                {isStrangeDomain && (
                                  <Icon name="AlertTriangle" className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                                )}
                                <Badge 
                                  variant={platform.status === 'ACTIVE' ? 'default' : 'secondary'} 
                                  className="text-xs px-2 py-0.5 font-semibold"
                                >
                                  {platform.status === 'ACTIVE' ? 'Акт' : platform.status === 'PAUSED' ? 'Пауза' : 'Откл'}
                                </Badge>
                              </div>
                              {platform.stats ? (
                                <>
                                  <div className="text-right font-medium text-slate-700">
                                    {platform.stats.impressions.toLocaleString('ru-RU')}
                                  </div>
                                  <div className="text-right font-medium text-slate-700">
                                    {platform.stats.clicks.toLocaleString('ru-RU')}
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-semibold ${
                                      platform.stats.ctr > 2 ? 'text-emerald-600' : 
                                      platform.stats.ctr > 1 ? 'text-blue-600' : 'text-slate-600'
                                    }`}>
                                      {platform.stats.ctr}%
                                    </span>
                                  </div>
                                  <div className="text-right font-medium text-slate-700">
                                    {platform.stats.cost.toLocaleString('ru-RU')} ₽
                                  </div>
                                  <div className="text-right font-medium text-slate-700">
                                    {displayCostPerGoal} ₽
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="font-semibold text-slate-900">{displayConversions}</span>
                                      <span className={`text-xs ${
                                        (displayConvRate || 0) > 5 ? 'text-emerald-600' : 
                                        (displayConvRate || 0) > 2 ? 'text-blue-600' : 'text-slate-400'
                                      }`}>
                                        ({displayConvRate}%)
                                      </span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-right text-slate-400">—</div>
                                  <div className="text-right text-slate-400">—</div>
                                  <div className="text-right text-slate-400">—</div>
                                  <div className="text-right text-slate-400">—</div>
                                  <div className="text-right text-slate-400">—</div>
                                  <div className="text-right text-slate-400">—</div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
