import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
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
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
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
                  {campaign.type}
                </Badge>
                <Badge
                  variant={campaign.status === 'ON' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {campaign.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
