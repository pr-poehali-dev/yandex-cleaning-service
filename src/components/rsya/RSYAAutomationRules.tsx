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

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
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
  cost_per_conversion: 'Цена конв. ₽'
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
      name: 'Мусорные домены',
      enabled: true,
      conditions: [
        { id: '1-1', type: 'pattern', pattern: 'dsp' },
        { id: '1-2', type: 'pattern', pattern: 'vpn' },
        { id: '1-3', type: 'pattern', pattern: 'com.' }
      ]
    },
    {
      id: '2',
      name: 'Дорого без конверсий',
      enabled: false,
      conditions: [
        { id: '2-1', type: 'metric', field: 'cost', operator: '>=', value: 5000 },
        { id: '2-2', type: 'metric', field: 'conversions', operator: '=', value: 0 }
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
      conditions: []
    };
    setEditingRule(newRule);
    setShowCreateForm(true);
  };

  const saveRule = () => {
    if (!editingRule || editingRule.conditions.length === 0) return;
    
    const existingIndex = rules.findIndex(r => r.id === editingRule.id);
    if (existingIndex >= 0) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    } else {
      setRules(prev => [...prev, editingRule]);
    }
    
    onApplyRule(editingRule);
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
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon name="Zap" className="h-5 w-5 text-emerald-600" />
            Правила автоблокировки
          </CardTitle>
          <Button onClick={createNewRule} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Icon name="Plus" className="h-4 w-4 mr-1" />
            Создать
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {showCreateForm && editingRule ? (
          <div className="mb-4 p-3 border-2 border-emerald-200 rounded-lg bg-emerald-50/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Новое правило</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setEditingRule(null); }}>
                <Icon name="X" className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="Название правила"
                className="text-sm"
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Условия (все должны выполняться)</label>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => addCondition('pattern')} className="h-7 text-xs">
                      <Icon name="Text" className="h-3 w-3 mr-1" />
                      Вхождение
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addCondition('metric')} className="h-7 text-xs">
                      <Icon name="TrendingUp" className="h-3 w-3 mr-1" />
                      Метрика
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {editingRule.conditions.map((cond) => (
                    <div key={cond.id} className="flex items-center gap-2 bg-white p-2 rounded border text-sm">
                      {cond.type === 'pattern' ? (
                        <>
                          <Icon name="Text" className="h-4 w-4 text-slate-400" />
                          <span className="text-xs text-slate-600 whitespace-nowrap">Домен содержит:</span>
                          <Input
                            value={cond.pattern || ''}
                            onChange={(e) => updateCondition(cond.id, { pattern: e.target.value })}
                            placeholder="dsp, vpn, com."
                            className="flex-1 h-8 text-sm"
                          />
                        </>
                      ) : (
                        <>
                          <Icon name="TrendingUp" className="h-4 w-4 text-slate-400" />
                          <select
                            value={cond.field}
                            onChange={(e) => updateCondition(cond.id, { field: e.target.value as any })}
                            className="px-2 py-1 border rounded text-xs"
                          >
                            {Object.entries(METRIC_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(cond.id, { operator: e.target.value as any })}
                            className="px-2 py-1 border rounded text-xs w-14"
                          >
                            {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            value={cond.value || 0}
                            onChange={(e) => updateCondition(cond.id, { value: Number(e.target.value) })}
                            className="w-24 h-8 text-sm"
                          />
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeCondition(cond.id)} className="h-7 w-7 p-0">
                        <Icon name="X" className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}

                  {editingRule.conditions.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Добавьте хотя бы одно условие
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setShowCreateForm(false); setEditingRule(null); }}>
                  Отмена
                </Button>
                <Button size="sm" onClick={saveRule} disabled={editingRule.conditions.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                  <Icon name="Save" className="h-4 w-4 mr-1" />
                  Сохранить и применить
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-2.5 rounded-lg border transition-all ${
                rule.enabled 
                  ? 'border-emerald-200 bg-emerald-50/30' 
                  : 'border-slate-200 bg-slate-50/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <h4 className="font-semibold text-sm text-slate-900">{rule.name}</h4>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 ml-9">
                    {rule.conditions.map((cond, idx) => (
                      <div key={cond.id} className="flex items-center gap-1">
                        {idx > 0 && <span className="text-xs text-slate-400 font-medium">И</span>}
                        <Badge variant="outline" className="text-xs py-0 h-5">
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

                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingRule(rule); setShowCreateForm(true); }}
                    className="h-7 w-7 p-0"
                  >
                    <Icon name="Edit" className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                  >
                    <Icon name="Trash2" className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApplyRule(rule)}
                    disabled={!rule.enabled}
                    className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-2"
                  >
                    <Icon name="Play" className="h-3 w-3 mr-1" />
                    Применить
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {rules.length === 0 && !showCreateForm && (
            <div className="text-center py-8 text-slate-400">
              <Icon name="Zap" className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <div className="text-sm font-medium">Нет правил</div>
              <div className="text-xs mt-1">Создайте первое правило</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
