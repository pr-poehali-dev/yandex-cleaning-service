import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Icon from '@/components/ui/icon';

export default function HowToUse() {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: 'Регистрация и вход',
      description: 'Войдите в систему через номер телефона. Код подтверждения придёт в SMS.',
      icon: 'UserPlus' as const
    },
    {
      number: 2,
      title: 'Создайте проект',
      description: 'Нажмите "Новый проект" и введите название. Проект сохранится автоматически.',
      icon: 'FolderPlus' as const
    },
    {
      number: 3,
      title: 'Введите ключевые слова',
      description: 'Добавьте ключи вручную (по одному на строку) или соберите через Яндекс.Вордстат.',
      icon: 'FileText' as const
    },
    {
      number: 4,
      title: 'Выберите регионы',
      description: 'Укажите города для показа рекламы. Можно выбрать несколько регионов одновременно.',
      icon: 'MapPin' as const
    },
    {
      number: 5,
      title: 'Настройте цель',
      description: 'Выберите "Контекстная реклама" или "SEO" в зависимости от задачи.',
      icon: 'Target' as const
    },
    {
      number: 6,
      title: 'Укажите интенты',
      description: 'Отметьте нужные типы запросов: коммерческие, транзакционные, информационные, навигационные.',
      icon: 'Filter' as const
    },
    {
      number: 7,
      title: 'AI кластеризация',
      description: 'После обработки OpenAI предложит названия кластеров на основе собранных ключей.',
      icon: 'Sparkles' as const
    },
    {
      number: 8,
      title: 'Получите результаты',
      description: 'Скачайте готовые кластеры в Excel или TXT. Минус-слова будут в отдельном файле.',
      icon: 'Download' as const
    }
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl mb-4">
              <Icon name="BookOpen" size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
              Как пользоваться DirectKit
            </h1>
            <p className="text-lg text-slate-600">
              Пошаговая инструкция по работе с сервисом
            </p>
          </div>

          <div className="space-y-6 mb-8">
            {steps.map((step) => (
              <Card key={step.number} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Icon name={step.icon} size={20} className="text-emerald-600" />
                      {step.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pl-20">
                  <p className="text-slate-600">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Lightbulb" size={24} className="text-amber-500" />
                Советы для лучших результатов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-700">
              <div className="flex items-start gap-2">
                <Icon name="Check" size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Используйте минимум 10-20 ключевых слов для качественной кластеризации</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon name="Check" size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Выбирайте только релевантные регионы для более точных данных</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon name="Check" size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Проверяйте минус-слова перед загрузкой в рекламный кабинет</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon name="Check" size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>AI названия кластеров можно редактировать вручную перед экспортом</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={() => navigate('/clustering')}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
              size="lg"
            >
              <Icon name="ArrowRight" size={20} className="mr-2" />
              Создать первый проект
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="lg"
            >
              На главную
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
