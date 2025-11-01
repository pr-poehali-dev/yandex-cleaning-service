import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';

interface RuleCondition {
  id: string;
  type: 'pattern' | 'metric';
  field?: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'cpc' | 'conversions' | 'conversion_rate' | 'cost_per_conversion';
  operator?: '>=' | '<=' | '>' | '<' | '=';
  value?: number;
  pattern?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: 'block' | 'select';
  matchCount?: number;
}

interface RSYAAutomationRulesProps {
  onApplyRule: (rule: AutomationRule) => void;
}

const METRIC_LABELS: Record<string, string> = {
  impressions: 'Показы',
  clicks: 'Клики',
  ctr: 'CTR %',
  cost: 'Расход ₽',
  cpc: 'CPC ₽',
  conversions: 'Конверсии',
  conversion_rate: 'CR %',
  cost_per_conversion: 'Цена конверсии ₽'
};

const OPERATOR_LABELS: Record<string, string> = {
  '>=': '≥',
  '<=': '≤',
  '>': '>',
  '<': '<',
  '=': '='
};

export default function RSYAAutomationRules({ onApplyRule }: RSYAAutomationRulesProps) {
  const [rules, setRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Блокировать мусорные домены',
      enabled: true,
      action: 'block',
      conditions: [
        { id: '1-1', type: 'pattern', pattern: 'dsp' },
        { id: '1-2', type: 'pattern', pattern: 'vpn' },
        { id: '1-3', type: 'pattern', pattern: 'com.' }
      ]
    },
    {
      id: '2',
      name: 'Дорогие без конверсий',
      enabled: true,
      action: 'block',
      conditions: [
        { id: '2-1', type: 'metric', field: 'cost', operator: '>=', value: 5000 },
        { id: '2-2', type: 'metric', field: 'conversions', operator: '=', value: 0 }
      ]
    },
    {
      id: '3',
      name: 'Низкий CTR при больших показах',
      enabled: false,
      action: 'select',
      conditions: [
        { id: '3-1', type: 'metric', field: 'impressions', operator: '>=', value: 1000 },
        { id: '3-2', type: 'metric', field: 'ctr', operator: '<=', value: 0.5 }
      ]
    }
  ]);

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const createNewRule = () => {
    const newRule: AutomationRule = {
      id: Date.now().toString(),
      name: 'Новое правило',
      enabled: true,
      action: 'block',
      conditions: []
    };
    setEditingRule(newRule);
    setShowCreateForm(true);
  };

  const saveRule = () => {
    if (!editingRule) return;
    
    const existingIndex = rules.findIndex(r => r.id === editingRule.id);
    if (existingIndex >= 0) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    } else {
      setRules(prev => [...prev, editingRule]);
    }
    
    setEditingRule(null);
    setShowCreateForm(false);
  };

  const addCondition = (type: 'pattern' | 'metric') => {
    if (!editingRule) return;
    
    const newCondition: RuleCondition = {
      id: `${editingRule.id}-${Date.now()}`,
      type,
      ...(type === 'pattern' ? { pattern: '' } : { 
        field: 'impressions', 
        operator: '>=', 
        value: 0 
      })
    };
    
    setEditingRule({
      ...editingRule,
      conditions: [...editingRule.conditions, newCondition]
    });
  };

  const updateCondition = (condId: string, updates: Partial<RuleCondition>) => {
    if (!editingRule) return;
    
    setEditingRule({
      ...editingRule,
      conditions: editingRule.conditions.map(c => 
        c.id === condId ? { ...c, ...updates } : c
      )
    });
  };

  const removeCondition = (condId: string) => {
    if (!editingRule) return;
    
    setEditingRule({
      ...editingRule,
      conditions: editingRule.conditions.filter(c => c.id !== condId)
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon name="Zap" className="h-6 w-6 text-purple-600" />
            Правила автоматизации
          </CardTitle>
          <Button onClick={createNewRule} size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Icon name="Plus" className="h-4 w-4 mr-1" />
            Создать правило
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {showCreateForm && editingRule ? (
          <div className="mb-6 p-4 border-2 border-purple-200 rounded-lg bg-purple-50/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">
                {rules.find(r => r.id === editingRule.id) ? 'Редактировать правило' : 'Новое правило'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setEditingRule(null); }}>
                <Icon name="X" className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Название правила</label>
                <Input
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="Например: Блокировать дорогие площадки"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Действие</label>
                <div className="flex gap-2">
                  <Button
                    variant={editingRule.action === 'block' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditingRule({ ...editingRule, action: 'block' })}
                  >
                    <Icon name="Ban" className="h-4 w-4 mr-1" />
                    Добавить в блокировку
                  </Button>
                  <Button
                    variant={editingRule.action === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditingRule({ ...editingRule, action: 'select' })}
                  >
                    <Icon name="CheckSquare" className="h-4 w-4 mr-1" />
                    Только выбрать
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Условия (все должны выполняться)</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addCondition('pattern')}>
                      <Icon name="Text" className="h-4 w-4 mr-1" />
                      Вхождение
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addCondition('metric')}>
                      <Icon name="TrendingUp" className="h-4 w-4 mr-1" />
                      Метрика
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {editingRule.conditions.map((cond) => (
                    <div key={cond.id} className="flex items-center gap-2 bg-white p-3 rounded border">
                      {cond.type === 'pattern' ? (
                        <>
                          <Icon name="Text" className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">Домен содержит:</span>
                          <Input
                            value={cond.pattern || ''}
                            onChange={(e) => updateCondition(cond.id, { pattern: e.target.value })}
                            placeholder="dsp, vpn, com."
                            className="flex-1"
                          />
                        </>
                      ) : (
                        <>
                          <Icon name="TrendingUp" className="h-4 w-4 text-slate-400" />
                          <select
                            value={cond.field}
                            onChange={(e) => updateCondition(cond.id, { field: e.target.value as any })}
                            className="px-3 py-2 border rounded text-sm"
                          >
                            {Object.entries(METRIC_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(cond.id, { operator: e.target.value as any })}
                            className="px-3 py-2 border rounded text-sm w-20"
                          >
                            {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            value={cond.value || 0}
                            onChange={(e) => updateCondition(cond.id, { value: Number(e.target.value) })}
                            className="w-32"
                          />
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeCondition(cond.id)}>
                        <Icon name="Trash2" className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}

                  {editingRule.conditions.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Добавьте хотя бы одно условие
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowCreateForm(false); setEditingRule(null); }}>
                  Отмена
                </Button>
                <Button onClick={saveRule} disabled={editingRule.conditions.length === 0}>
                  <Icon name="Save" className="h-4 w-4 mr-1" />
                  Сохранить правило
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                rule.enabled 
                  ? 'border-purple-200 bg-purple-50/30' 
                  : 'border-slate-200 bg-slate-50/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                    <Badge variant={rule.action === 'block' ? 'destructive' : 'default'} className="text-xs">
                      {rule.action === 'block' ? 'Блокировка' : 'Выбор'}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 ml-11">
                    {rule.conditions.map((cond, idx) => (
                      <div key={cond.id} className="flex items-center gap-1">
                        {idx > 0 && <span className="text-xs text-slate-400 font-medium">И</span>}
                        <Badge variant="outline" className="text-xs">
                          {cond.type === 'pattern' ? (
                            <>содержит "{cond.pattern}"</>
                          ) : (
                            <>{METRIC_LABELS[cond.field!]} {OPERATOR_LABELS[cond.operator!]} {cond.value}</>
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingRule(rule); setShowCreateForm(true); }}
                  >
                    <Icon name="Edit" className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Icon name="Trash2" className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApplyRule(rule)}
                    disabled={!rule.enabled}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Icon name="Play" className="h-4 w-4 mr-1" />
                    Применить
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Icon name="Zap" className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div className="font-medium">Нет правил</div>
              <div className="text-sm mt-1">Создайте первое правило автоматизации</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
