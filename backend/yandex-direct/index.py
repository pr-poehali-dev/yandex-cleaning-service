import json
import os
from typing import Dict, Any, List
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Работа с API Яндекс.Директ - получение кампаний РСЯ и OAuth конфиг
    Args: event - dict с httpMethod, queryStringParameters, body
          context - объект с request_id
    Returns: HTTP response dict с данными кампаний
    '''
    method: str = event.get('httpMethod', 'GET')
    path: str = event.get('path', '')
    query_params = event.get('queryStringParameters', {}) or {}
    
    # CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # GET /config - вернуть OAuth Client ID
    if method == 'GET' and query_params.get('action') == 'config':
        client_id = os.environ.get('YANDEX_DIRECT_CLIENT_ID', '')
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'clientId': client_id})
        }
    
    # GET /campaigns - получить кампании РСЯ
    if method == 'GET':
        headers = event.get('headers', {})
        token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
        client_login = headers.get('X-Client-Login') or headers.get('x-client-login')
        
        if not token:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Отсутствует токен авторизации'})
            }
        
        try:
            print(f'[DEBUG] Requesting Yandex.Direct API with token: {token[:10]}...')
            print(f'[DEBUG] Client-Login: {client_login}')
            
            # Проверяем режим sandbox
            is_sandbox = query_params.get('sandbox') == 'true'
            api_url = 'https://api-sandbox.direct.yandex.com/json/v5/campaigns' if is_sandbox else 'https://api.direct.yandex.com/json/v5/campaigns'
            
            print(f'[DEBUG] Using API URL: {api_url} (sandbox={is_sandbox})')
            
            request_headers = {
                'Accept-Language': 'ru'
            }
            
            # И для песочницы, и для продакшна используем Bearer OAuth токен
            request_headers['Authorization'] = f'Bearer {token}'
            
            # Добавляем Client-Login если указан
            if client_login:
                request_headers['Client-Login'] = client_login
            
            response = requests.post(
                api_url,
                headers=request_headers,
                json={
                    'method': 'get',
                    'params': {
                        'SelectionCriteria': {},
                        'FieldNames': ['Id', 'Name', 'Type', 'Status']
                    }
                },
                timeout=10
            )
            
            print(f'[DEBUG] API Response status: {response.status_code}')
            print(f'[DEBUG] API Response body: {response.text[:500]}')
            
            data = response.json()
            
            # Проверка на ошибку API (Яндекс возвращает 200 даже при ошибках)
            if 'error' in data:
                error_info = data['error']
                error_msg = error_info.get('error_string', 'Неизвестная ошибка')
                error_detail = error_info.get('error_detail', '')
                error_code = error_info.get('error_code', 0)
                
                print(f'[ERROR] Yandex.Direct API error: {error_msg} (код {error_code})')
                print(f'[ERROR] Details: {error_detail}')
                
                # Специальная обработка ошибки 513 (не подключен к Директу)
                if error_code == 513 and is_sandbox:
                    error_msg = 'Аккаунт не активирован в песочнице Директа'
                    error_detail = 'Перейдите на sandbox.direct.yandex.ru, авторизуйтесь и создайте тестовую кампанию для активации песочницы'
                elif error_code == 513:
                    error_detail = 'Зайдите в Яндекс.Директ (direct.yandex.ru) и завершите регистрацию'
                
                # Ошибка 58 - незавершенная регистрация приложения
                if error_code == 58:
                    error_msg = 'Приложение не активировано'
                    if not error_detail:
                        error_detail = 'Необходимо активировать приложение в интерфейсе Яндекс.OAuth и подать заявку на доступ к Директу'
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'campaigns': [],
                        'error': error_msg,
                        'error_detail': error_detail,
                        'error_code': error_code
                    })
                }
            
            campaigns_raw = data.get('result', {}).get('Campaigns', [])
            
            print(f'[DEBUG] Found {len(campaigns_raw)} campaigns')
            
            campaigns = []
            for c in campaigns_raw:
                campaign_type = c.get('Type', '')
                if campaign_type == 'TEXT_CAMPAIGN':
                    campaign_id = str(c.get('Id'))
                    
                    # Получаем группы объявлений для кампании
                    adgroups_url = api_url.replace('/campaigns', '/adgroups')
                    adgroups_response = requests.post(
                        adgroups_url,
                        headers=request_headers,
                        json={
                            'method': 'get',
                            'params': {
                                'SelectionCriteria': {'CampaignIds': [int(campaign_id)]},
                                'FieldNames': ['Id', 'Name', 'Status'],
                                'TextAdGroupFieldNames': ['BiddingStrategy']
                            }
                        },
                        timeout=10
                    )
                    
                    platforms = []
                    if adgroups_response.status_code == 200:
                        adgroups_data = adgroups_response.json()
                        print(f'[DEBUG] AdGroups response for campaign {campaign_id}: {str(adgroups_data)[:300]}')
                        
                        if 'result' in adgroups_data:
                            adgroups = adgroups_data.get('result', {}).get('AdGroups', [])
                            print(f'[DEBUG] Found {len(adgroups)} adgroups for campaign {campaign_id}')
                            
                            for ag in adgroups:
                                text_adgroup = ag.get('TextAdGroup', {})
                                bidding = text_adgroup.get('BiddingStrategy', {})
                                network_bidding = bidding.get('Network', {})
                                if network_bidding:
                                    platforms.append({
                                        'adgroup_id': str(ag.get('Id')),
                                        'adgroup_name': ag.get('Name', 'Без названия'),
                                        'status': ag.get('Status'),
                                        'network_enabled': True
                                    })
                        else:
                            print(f'[DEBUG] No result in adgroups response for campaign {campaign_id}')
                    else:
                        print(f'[DEBUG] AdGroups request failed with status {adgroups_response.status_code}')
                    
                    # Получаем цели через GetRetargetingGoals (Live API v4)
                    goals = []
                    
                    try:
                        # Live API v4 не работает в sandbox, используем только для продакшна
                        if not is_sandbox and client_login:
                            live_api_url = 'https://api.direct.yandex.ru/live/v4/json/'
                            goals_body = {
                                'method': 'GetRetargetingGoals',
                                'param': {'Logins': [client_login]},
                                'locale': 'ru',
                                'token': token
                            }
                            
                            goals_response = requests.post(
                                live_api_url,
                                json=goals_body,
                                timeout=10
                            )
                            
                            print(f'[DEBUG] GetRetargetingGoals response: {goals_response.status_code}')
                            print(f'[DEBUG] GetRetargetingGoals body: {goals_response.text[:500]}')
                            
                            if goals_response.status_code == 200:
                                goals_data = goals_response.json()
                                if 'data' in goals_data:
                                    goals_raw = goals_data['data']
                                    # Берем только первые 10 целей (лимит Reports API)
                                    goals = [
                                        {'id': str(g.get('GoalID', g.get('id'))), 'name': g.get('Name', g.get('name', 'Без названия')), 'type': 'GOAL'} 
                                        for g in goals_raw[:10]
                                    ]
                                    print(f'[DEBUG] Found {len(goals)} goals: {goals}')
                        else:
                            print(f'[DEBUG] Skipping goals fetch: is_sandbox={is_sandbox}, client_login={client_login}')
                    except Exception as e:
                        print(f'[DEBUG] Failed to fetch goals: {str(e)}')
                    
                    # Если площадок нет, добавляем тестовые для демонстрации
                    if len(platforms) == 0 and is_sandbox:
                        import random
                        
                        # Если цели не получены, создаем тестовые
                        if not goals:
                            goals = [
                                {'id': '1', 'name': 'Заявка', 'type': 'GOAL'},
                                {'id': '2', 'name': 'Покупка', 'type': 'GOAL'},
                                {'id': '3', 'name': 'Регистрация', 'type': 'GOAL'},
                                {'id': '4', 'name': 'Добавление в корзину', 'type': 'GOAL'},
                                {'id': '5', 'name': 'Звонок', 'type': 'GOAL'},
                                {'id': '6', 'name': 'Подписка', 'type': 'GOAL'}
                            ]
                        
                        test_domains = [
                            # Нормальные площадки
                            'mail.ru', 'dzen.ru', 'yandex.ru', 'vk.com', 'ok.ru',
                            'rambler.ru', 'lenta.ru', 'ria.ru', 'gazeta.ru', 'kommersant.ru',
                            'rbc.ru', 'vedomosti.ru', 'forbes.ru', 'tass.ru', 'interfax.ru',
                            'sports.ru', 'championat.com', 'kp.ru', 'mk.ru', 'aif.ru',
                            'vc.ru', 'habr.com', 'pikabu.ru', 'drive2.ru', 'avito.ru',
                            'auto.ru', 'cian.ru', 'domofond.ru', 'youla.ru', 'wildberries.ru',
                            'ozon.ru', 'lamoda.ru', 'citilink.ru', 'mvideo.ru', 'eldorado.ru',
                            'dns-shop.ru', 'aliexpress.ru', 'sberbank.ru', 'tinkoff.ru', 'vtb.ru',
                            'alfabank.ru', 'gosuslugi.ru', 'mos.ru', 'spb.ru', 'travel.ru',
                            'aviasales.ru', 'booking.com', 'tripadvisor.ru', 'hotels.ru', 'tutu.ru',
                            # Странные/мусорные площадки
                            'dsp.ewer.ru', 'puzzles.yandex.ru', 'vps.com', 'cdn-tracker.net',
                            'ad-server.xyz', 'promo.click', 'banner-exchange.io', 'rtb-network.org',
                            'adtech.solutions', 'media-buy.pro', 'traffic-source.biz', 'click-farm.co',
                            'bot-traffic.ru', 'fake-impressions.net', 'spam-ads.com', 'junk-traffic.org',
                            '123-ads.ru', 'xxx-promo.net', 'casino-traffic.biz', 'adult-banner.xxx',
                            'redirect-chain.io', 'cloaking-site.ru', 'doorway-page.com', 'parked-domain.net',
                            'expired-ssl.org', 'malware-host.ru', 'phishing-page.net', 'scam-ads.biz'
                        ]
                        
                        for i in range(100):
                            domain = random.choice(test_domains) if i >= len(test_domains) else test_domains[i % len(test_domains)]
                            
                            # Генерируем случайную статистику
                            impressions = random.randint(1000, 50000)
                            clicks = random.randint(10, int(impressions * 0.05))
                            ctr = round((clicks / impressions) * 100, 2) if impressions > 0 else 0
                            cost = random.randint(500, 50000)
                            cpc = round(cost / clicks, 2) if clicks > 0 else 0
                            conversions = random.randint(0, int(clicks * 0.15))
                            conversion_rate = round((conversions / clicks) * 100, 2) if clicks > 0 else 0
                            
                            # Генерируем статистику по целям
                            goals_stats = {}
                            for goal in goals:
                                goal_conversions = random.randint(0, conversions)
                                goals_stats[goal['id']] = {
                                    'conversions': goal_conversions,
                                    'conversion_rate': round((goal_conversions / clicks) * 100, 2) if clicks > 0 else 0,
                                    'cost_per_goal': round(cost / goal_conversions, 2) if goal_conversions > 0 else 0
                                }
                            
                            platforms.append({
                                'adgroup_id': f'{campaign_id}_{i+1}',
                                'adgroup_name': domain,
                                'status': random.choice(['ACTIVE', 'PAUSED', 'SUSPENDED']),
                                'network_enabled': True,
                                'stats': {
                                    'impressions': impressions,
                                    'clicks': clicks,
                                    'ctr': ctr,
                                    'cost': cost,
                                    'cpc': cpc,
                                    'conversions': conversions,
                                    'conversion_rate': conversion_rate,
                                    'avg_position': round(random.uniform(1, 10), 1),
                                    'goals': goals_stats
                                }
                            })
                    
                    campaigns.append({
                        'id': campaign_id,
                        'name': c.get('Name'),
                        'type': campaign_type,
                        'status': c.get('Status'),
                        'platforms': platforms,
                        'goals': goals
                    })
            
            print(f'[DEBUG] Filtered {len(campaigns)} TEXT_CAMPAIGN campaigns with platforms')
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'campaigns': campaigns})
            }
            
        except Exception as e:
            print(f'[ERROR] Exception: {str(e)}')
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'campaigns': [],
                    'error': f'Ошибка: {str(e)}',
                    'message': 'Не удалось подключиться к API Яндекс.Директ'
                })
            }
    
    # POST /exchange_code - обмен кода на токен
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'exchange_code':
            code = body_data.get('code')
            if not code:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Код авторизации не указан'})
                }
            
            client_id = os.environ.get('YANDEX_DIRECT_CLIENT_ID', '')
            client_secret = os.environ.get('YANDEX_DIRECT_CLIENT_SECRET', '')
            
            try:
                token_response = requests.post(
                    'https://oauth.yandex.ru/token',
                    data={
                        'grant_type': 'authorization_code',
                        'code': code,
                        'client_id': client_id,
                        'client_secret': client_secret
                    }
                )
                
                if token_response.status_code != 200:
                    print(f'[ERROR] Token exchange failed: {token_response.text}')
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Ошибка обмена кода на токен', 'details': token_response.text})
                    }
                
                token_data = token_response.json()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps(token_data)
                }
            except Exception as e:
                print(f'[ERROR] Token exchange exception: {str(e)}')
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Ошибка: {str(e)}'})
                }
        
        # POST /create_test_campaign - создать тестовую кампанию в песочнице
        if action == 'create_test_campaign':
            token = body_data.get('token')
            client_login = body_data.get('client_login')
            
            if not token:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Токен не указан'})
                }
            
            try:
                api_url = 'https://api-sandbox.direct.yandex.com/json/v5/campaigns'
                
                request_headers = {
                    'Authorization': f'Bearer {token}',
                    'Accept-Language': 'ru'
                }
                
                if client_login:
                    request_headers['Client-Login'] = client_login
                
                # Создаём тестовую РСЯ кампанию
                from datetime import datetime, timedelta
                tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                
                import random
                
                campaign_data = {
                    'method': 'add',
                    'params': {
                        'Campaigns': [{
                            'Name': f'РСЯ тест {datetime.now().strftime("%d.%m %H:%M")}',
                            'StartDate': tomorrow,
                            'TextCampaign': {
                                'BiddingStrategy': {
                                    'Search': {
                                        'BiddingStrategyType': 'SERVING_OFF'
                                    },
                                    'Network': {
                                        'BiddingStrategyType': 'WB_MAXIMUM_CLICKS',
                                        'WbMaximumClicks': {
                                            'BidCeiling': 100000000,
                                            'WeeklySpendLimit': 5000000000
                                        }
                                    }
                                }
                            }
                        }]
                    }
                }
                
                print(f'[DEBUG] Creating campaign with data: {campaign_data}')
                
                response = requests.post(
                    api_url,
                    headers=request_headers,
                    json=campaign_data,
                    timeout=10
                )
                
                print(f'[DEBUG] Create campaign response status: {response.status_code}')
                print(f'[DEBUG] Create campaign response: {response.text}')
                
                data = response.json()
                
                if 'error' in data:
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'success': False,
                            'error': data['error'].get('error_string', 'Неизвестная ошибка'),
                            'error_detail': data['error'].get('error_detail', '')
                        })
                    }
                
                # Проверяем результат создания
                add_results = data.get('result', {}).get('AddResults', [])
                if not add_results or 'Errors' in add_results[0]:
                    errors = add_results[0].get('Errors', []) if add_results else []
                    error_msg = errors[0].get('Message', 'Неизвестная ошибка') if errors else 'Не удалось создать кампанию'
                    error_detail = errors[0].get('Details', '') if errors else ''
                    
                    print(f'[ERROR] Campaign creation failed: {error_msg}')
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'success': False,
                            'error': error_msg,
                            'error_detail': error_detail
                        })
                    }
                
                campaign_id = add_results[0].get('Id')
                
                import time
                time.sleep(1)
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'campaign_id': campaign_id
                    })
                }
            except Exception as e:
                print(f'[ERROR] Create campaign exception: {str(e)}')
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Ошибка: {str(e)}'})
                }
        
        # POST /clean - запустить чистку площадок
        headers = event.get('headers', {})
        token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
        client_login = headers.get('X-Client-Login') or headers.get('x-client-login')
        
        if not token:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Отсутствует токен авторизации'})
            }
        
        campaign_ids = body_data.get('campaignIds', [])
        filters = body_data.get('filters', [])
        
        if not campaign_ids:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Не указаны ID кампаний'})
            }
        
        if not filters:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Не указаны фильтры'})
            }
        
        # TODO: Реальная логика чистки через API Яндекс.Директ
        # 1. Получить площадки кампаний
        # 2. Отфильтровать по паттернам
        # 3. Отключить через API
        
        # Mock результат
        result = {
            'disabled': 247,
            'total': 1520,
            'campaignsProcessed': len(campaign_ids)
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Метод не поддерживается'})
    }