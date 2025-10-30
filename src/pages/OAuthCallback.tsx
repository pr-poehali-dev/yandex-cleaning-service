import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const OAUTH_API = 'https://functions.poehali.dev/7670577f-a6d7-4122-b6ca-d0c77f43e21e';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      
      if (!code) {
        toast.error('Ошибка авторизации: код не получен');
        navigate('/');
        return;
      }

      try {
        const response = await fetch(OAUTH_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        if (!response.ok) {
          throw new Error('Failed to get token');
        }

        const data = await response.json();
        
        localStorage.setItem('yandex_wordstat_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('yandex_wordstat_refresh_token', data.refresh_token);
        }

        toast.success('Авторизация успешна!');
        
        const returnUrl = localStorage.getItem('oauth_return_url') || '/';
        localStorage.removeItem('oauth_return_url');
        navigate(returnUrl);
        
      } catch (error) {
        console.error('OAuth error:', error);
        toast.error('Ошибка при получении токена');
        navigate('/');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Авторизация через Яндекс...</p>
      </div>
    </div>
  );
}
