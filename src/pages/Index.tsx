import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockPlatforms = [
  { id: 1, name: 'example.com', impressions: 125430, clicks: 3245, ctr: 2.59, conversions: 87, cost: 45230, status: 'active' },
  { id: 2, name: 'test-site.ru', impressions: 89234, clicks: 1678, ctr: 1.88, conversions: 34, cost: 28950, status: 'active' },
  { id: 3, name: 'mobile-app.net', impressions: 234567, clicks: 5432, ctr: 2.32, conversions: 145, cost: 76540, status: 'active' },
  { id: 4, name: 'news-portal.com', impressions: 45678, clicks: 456, ctr: 1.00, conversions: 8, cost: 12340, status: 'low' },
  { id: 5, name: 'game-site.org', impressions: 178234, clicks: 4234, ctr: 2.38, conversions: 112, cost: 54320, status: 'active' },
  { id: 6, name: 'blog-network.ru', impressions: 34567, clicks: 289, ctr: 0.84, conversions: 5, cost: 8970, status: 'low' },
];

const performanceData = [
  { date: '15.10', impressions: 98234, clicks: 2145, conversions: 58 },
  { date: '16.10', impressions: 112345, clicks: 2567, conversions: 67 },
  { date: '17.10', impressions: 105678, clicks: 2389, conversions: 62 },
  { date: '18.10', impressions: 118234, clicks: 2734, conversions: 74 },
  { date: '19.10', impressions: 125430, clicks: 3001, conversions: 81 },
  { date: '20.10', impressions: 134567, clicks: 3245, conversions: 89 },
  { date: '21.10', impressions: 142890, clicks: 3567, conversions: 96 },
];

interface Platform {
  id?: number;
  campaignId?: string;
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cost: number;
  status: string;
}

const Index = () => {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>(mockPlatforms);
  const [loading, setLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const filteredPlatforms = platforms.filter(platform => {
    const matchesSearch = platform.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || platform.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalImpressions = platforms.reduce((sum, p) => sum + p.impressions, 0);
  const totalClicks = platforms.reduce((sum, p) => sum + p.clicks, 0);
  const totalConversions = platforms.reduce((sum, p) => sum + p.conversions, 0);
  const avgCTR = ((totalClicks / totalImpressions) * 100).toFixed(2);

  const loadPlatforms = async () => {
    if (!token && !showTokenInput) {
      setShowTokenInput(true);
      toast({
        title: 'Требуется токен',
        description: 'Введите OAuth-токен Яндекс Директа',
      });
      return;
    }

    if (!token) {
      toast({
        title: 'Токен не указан',
        description: 'Пожалуйста, введите токен',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/92a3c242-6114-450f-b744-88b7eda19d62?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      
      if (response.ok && data.platforms) {
        const loadedPlatforms = data.platforms.map((p: any, idx: number) => ({
          id: idx + 1,
          ...p
        }));
        setPlatforms(loadedPlatforms);
        toast({
          title: 'Данные загружены',
          description: `Найдено ${data.total} площадок из ${data.campaigns.length} кампаний`,
        });
      } else {
        toast({
          title: 'Ошибка загрузки',
          description: data.error || 'Не удалось загрузить данные',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка подключения',
        description: 'Проверьте токен Яндекс Директа',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (id: number) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const excludeSelected = () => {
    console.log('Исключить площадки:', selectedPlatforms);
    setSelectedPlatforms([]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Оптимизация площадок РСЯ</h1>
            <p className="text-muted-foreground mt-1">Анализ и управление площадками Яндекс Директ</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadPlatforms} disabled={loading} className="gap-2">
              <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Загрузка...' : 'Обновить данные'}
            </Button>
            <Button variant="outline" onClick={() => setShowTokenInput(!showTokenInput)} className="gap-2">
              <Icon name="Key" size={16} />
              {token ? 'Токен сохранён' : 'Ввести токен'}
            </Button>
          </div>
        </div>

        {showTokenInput && (
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>OAuth-токен Яндекс Директа</CardTitle>
              <CardDescription>Вставьте токен для подключения к API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="y0__xCtvb3CARjmlTsguOGj8xQwgPzDiwg4CJJDEsJa43d1bvT_Rk1a3rCN3Q"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
                <Button onClick={() => {
                  if (token) {
                    setShowTokenInput(false);
                    toast({ title: 'Токен сохранён', description: 'Теперь можно загрузить данные' });
                  }
                }}>
                  Сохранить
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Показы</CardTitle>
              <Icon name="Eye" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12.5% от прошлой недели</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Клики</CardTitle>
              <Icon name="MousePointerClick" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8.3% от прошлой недели</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CTR</CardTitle>
              <Icon name="TrendingUp" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCTR}%</div>
              <p className="text-xs text-muted-foreground">Средний по кампаниям</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Конверсии</CardTitle>
              <Icon name="Target" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConversions}</div>
              <p className="text-xs text-muted-foreground">+15.2% от прошлой недели</p>
            </CardContent>
          </Card>
        </div>

        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle>Динамика эффективности</CardTitle>
            <CardDescription>Анализ показателей за последние 7 дней</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="impressions" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="impressions">Показы</TabsTrigger>
                <TabsTrigger value="clicks">Клики</TabsTrigger>
                <TabsTrigger value="conversions">Конверсии</TabsTrigger>
              </TabsList>
              <TabsContent value="impressions" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="clicks" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="clicks" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="conversions" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="conversions" stroke="hsl(var(--success))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Площадки размещения</CardTitle>
                <CardDescription>Выберите площадки для исключения из кампаний</CardDescription>
              </div>
              <Button 
                onClick={excludeSelected} 
                disabled={selectedPlatforms.length === 0}
                className="gap-2"
              >
                <Icon name="Ban" size={16} />
                Исключить ({selectedPlatforms.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Поиск по названию площадки..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все площадки</SelectItem>
                  <SelectItem value="active">Эффективные</SelectItem>
                  <SelectItem value="low">Низкая эффективность</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Площадка</TableHead>
                    <TableHead className="text-right">Показы</TableHead>
                    <TableHead className="text-right">Клики</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Конверсии</TableHead>
                    <TableHead className="text-right">Расход</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlatforms.map((platform) => (
                    <TableRow
                      key={platform.id}
                      className={`cursor-pointer transition-colors ${
                        selectedPlatforms.includes(platform.id) ? 'bg-muted/50' : ''
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {selectedPlatforms.includes(platform.id) ? (
                            <Icon name="CheckSquare" className="h-5 w-5 text-primary" />
                          ) : (
                            <Icon name="Square" className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{platform.name}</TableCell>
                      <TableCell className="text-right">{platform.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{platform.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{platform.ctr}%</TableCell>
                      <TableCell className="text-right">{platform.conversions}</TableCell>
                      <TableCell className="text-right">{platform.cost.toLocaleString()} ₽</TableCell>
                      <TableCell>
                        <Badge variant={platform.status === 'active' ? 'default' : 'secondary'}>
                          {platform.status === 'active' ? 'Эффективная' : 'Низкая'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;