import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface PlatformStats {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  cpc: number;
  conversions: number;
  conversion_rate: number;
  avg_position: number;
}

interface Platform {
  adgroup_id: string;
  adgroup_name: string;
  status: string;
  network_enabled: boolean;
  stats?: PlatformStats;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  platforms?: Platform[];
}

interface RSYACampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaigns: string[];
  onToggleCampaign: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function RSYACampaignSelector({
  campaigns,
  selectedCampaigns,
  onToggleCampaign,
  onSelectAll,
  onDeselectAll
}: RSYACampaignSelectorProps) {
  const allSelected = campaigns.length > 0 && selectedCampaigns.length === campaigns.length;
  const someSelected = selectedCampaigns.length > 0 && selectedCampaigns.length < campaigns.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Target" className="h-5 w-5" />
              Выберите кампании
            </CardTitle>
            <CardDescription>
              Выбрано: {selectedCampaigns.length} из {campaigns.length}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Выбрать все
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={onDeselectAll}
              className="text-sm text-slate-600 hover:text-slate-700 font-medium"
            >
              Снять все
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onToggleCampaign(campaign.id)}
              >
                <Checkbox
                  checked={selectedCampaigns.includes(campaign.id)}
                  onCheckedChange={() => onToggleCampaign(campaign.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {campaign.name}
                  </div>
                  <div className="text-sm text-slate-500">ID: {campaign.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {campaign.platforms?.length || 0} площадок
                  </Badge>
                  <Badge
                    variant={campaign.status === 'ON' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {campaign.status}
                  </Badge>
                </div>
              </div>
              
              {campaign.platforms && campaign.platforms.length > 0 && (
                <div className="bg-slate-50 border-t border-slate-200">
                  <div className="px-3 py-2 border-b border-slate-200 bg-white">
                    <div className="grid grid-cols-8 gap-2 text-xs font-medium text-slate-600">
                      <div className="col-span-2">Площадка</div>
                      <div className="text-right">Показы</div>
                      <div className="text-right">Клики</div>
                      <div className="text-right">CTR %</div>
                      <div className="text-right">Расход ₽</div>
                      <div className="text-right">CPC ₽</div>
                      <div className="text-right">Конв.</div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {campaign.platforms.map((platform) => (
                      <div 
                        key={platform.adgroup_id} 
                        className="grid grid-cols-8 gap-2 px-3 py-2 text-xs border-b border-slate-100 hover:bg-white transition-colors"
                      >
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">{platform.adgroup_name}</span>
                          <Badge 
                            variant={platform.status === 'ACTIVE' ? 'default' : 'secondary'} 
                            className="text-xs px-1 py-0"
                          >
                            {platform.status === 'ACTIVE' ? 'Акт' : platform.status === 'PAUSED' ? 'Пауза' : 'Откл'}
                          </Badge>
                        </div>
                        {platform.stats ? (
                          <>
                            <div className="text-right text-slate-700">{platform.stats.impressions.toLocaleString()}</div>
                            <div className="text-right text-slate-700">{platform.stats.clicks.toLocaleString()}</div>
                            <div className="text-right text-slate-700">{platform.stats.ctr}%</div>
                            <div className="text-right text-slate-700">{platform.stats.cost.toLocaleString()}</div>
                            <div className="text-right text-slate-700">{platform.stats.cpc}</div>
                            <div className="text-right">
                              <span className="text-slate-700">{platform.stats.conversions}</span>
                              <span className="text-slate-400 ml-1">({platform.stats.conversion_rate}%)</span>
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}