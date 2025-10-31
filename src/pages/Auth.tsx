import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

export default function Auth() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Шапка */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl mb-4 shadow-lg">
            <Icon name="Zap" size={32} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-3">
            DirectKit
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Профессиональный сервис для сбора, кластеризации и очистки семантического ядра Яндекс.Директ
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            className="mt-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
            size="lg"
          >
            Войти в систему
            <Icon name="ArrowRight" size={20} className="ml-2" />
          </Button>
        </div>

        {/* Основные возможности */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3">
                <Icon name="Search" size={24} className="text-white" />
              </div>
              <CardTitle>Сбор семантики</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Автоматический парсинг запросов из Яндекс.Wordstat с поддержкой регионов и глубокой выгрузки данных
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3">
                <Icon name="Grid3x3" size={24} className="text-white" />
              </div>
              <CardTitle>Кластеризация</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Умная группировка запросов по интентам с поддержкой операторов Яндекс.Директ: кавычки, скобки, ! и +
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-3">
                <Icon name="Filter" size={24} className="text-white" />
              </div>
              <CardTitle>Очистка РСЯ</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Фильтрация и анализ площадок рекламной сети Яндекса для повышения эффективности кампаний
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Подробнее о функциях */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Возможности платформы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle2" size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Операторы соответствия Яндекс.Директ</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Полная поддержка операторов: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">"фраза"</span>, <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">[точный порядок]</span>, <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">!словоформа</span>, <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">+предлог</span> для точного таргетинга
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle2" size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Многопроектная работа</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Управляйте неограниченным количеством проектов: Wordstat, кластеризация и очистка РСЯ в одном интерфейсе
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle2" size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Экспорт в форматах Excel и CSV</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Выгружайте готовые кластеры и минус-слова для быстрой загрузки в Яндекс.Директ и Директ Коммандер
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle2" size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">История изменений</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Автосохранение работы и возможность отката к предыдущим версиям кластеризации
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Призыв к действию */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white">
          <CardContent className="p-8 text-center">
            <Icon name="Rocket" size={48} className="mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-3">Готовы начать работу?</h2>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              Войдите в систему и получите доступ ко всем инструментам для профессиональной работы с семантическим ядром
            </p>
            <Button 
              onClick={() => navigate('/login')}
              size="lg"
              className="bg-white text-emerald-600 hover:bg-slate-50 shadow-lg"
            >
              Войти в DirectKit
              <Icon name="ArrowRight" size={20} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
