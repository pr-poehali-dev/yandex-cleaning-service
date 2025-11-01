import json
import os
from typing import Dict, Any, List
import requests
import time

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
    
    # GET ?action=goals - получить цели из кампаний через PriorityGoals (API Директа v5)
    if method == 'GET' and query_params.get('action') == 'goals':
        headers_raw = event.get('headers', {})
        token = headers_raw.get('X-Auth-Token') or headers_raw.get('x-auth-token')
        
        if not token:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Отсутствует токен авторизации'})
            }
        
        try:
            print(f'[DEBUG] Loading goals from campaigns PriorityGoals with token: {token[:10]}...')
            
            is_sandbox = query_params.get('sandbox') == 'true'
            client_login = query_params.get('client_login')
            
            api_url = 'https://api-sandbox.direct.yandex.com/json/v5/campaigns' if is_sandbox else 'https://api.direct.yandex.com/json/v5/campaigns'
            
            headers_api = {
                'Content-Type': 'application/json', 
                'Accept-Language': 'ru',
                'Authorization': f'Bearer {token}'
            }
            if client_login:
                headers_api['Client-Login'] = client_login
            
            # Запрос кампаний с PriorityGoals
            response = requests.post(
                api_url,
                headers=headers_api,
                json={
                    'method': 'get',
                    'params': {
                        'SelectionCriteria': {},
                        'FieldNames': ['Id', 'Name', 'Type'],
                        'TextCampaignFieldNames': ['PriorityGoals'],
                        'UnifiedCampaignFieldNames': ['PriorityGoals']
                    }
                },
                timeout=30
            )
            
            print(f'[DEBUG] Direct API response: {response.status_code}')
            
            if response.status_code != 200:
                error_data = response.json()
                print(f'[ERROR] API error: {json.dumps(error_data)}')
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Ошибка Direct API', 'details': error_data})
                }
            
            data = response.json()
            
            if 'error' in data:
                print(f'[ERROR] Response error: {json.dumps(data["error"])}')
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': data['error'].get('error_string', 'API Error'), 'details': data['error']})
                }
            
            campaigns = data.get('result', {}).get('Campaigns', [])
            print(f'[DEBUG] Found {len(campaigns)} campaigns')
            
            # Собираем уникальные цели из всех кампаний
            goals_map = {}
            
            for campaign in campaigns:
                campaign_type = campaign.get('Type')
                campaign_id = campaign.get('Id')
                campaign_name = campaign.get('Name')
                
                # Собираем ID целей из разных мест
                goal_ids_in_campaign = set()
                
                # 1. Извлекаем PriorityGoals
                priority_goals = None
                if campaign_type == 'TEXT_CAMPAIGN':
                    text_campaign = campaign.get('TextCampaign')
                    if text_campaign:
                        priority_goals_obj = text_campaign.get('PriorityGoals')
                        if priority_goals_obj:
                            priority_goals = priority_goals_obj.get('Items', [])
                        
                        # 2. Извлекаем цели из стратегий BiddingStrategy
                        bidding = text_campaign.get('BiddingStrategy', {})
                        for location in ['Search', 'Network']:
                            strategy = bidding.get(location, {})
                            # Разные типы стратегий с целями
                            for strategy_type in ['WbMaximumConversionRate', 'AverageCpa', 'AverageCpaMultipleGoals', 'PayForConversion']:
                                strategy_data = strategy.get(strategy_type, {})
                                if isinstance(strategy_data, dict):
                                    # Одна цель
                                    if 'GoalId' in strategy_data:
                                        goal_ids_in_campaign.add(str(strategy_data['GoalId']))
                                    # Несколько целей
                                    if 'GoalIds' in strategy_data:
                                        for gid in strategy_data['GoalIds']:
                                            goal_ids_in_campaign.add(str(gid))
                
                elif campaign_type == 'UNIFIED_CAMPAIGN':
                    unified_campaign = campaign.get('UnifiedCampaign')
                    if unified_campaign:
                        priority_goals_obj = unified_campaign.get('PriorityGoals')
                        if priority_goals_obj:
                            priority_goals = priority_goals_obj.get('Items', [])
                
                # Добавляем цели из PriorityGoals
                if priority_goals:
                    for goal in priority_goals:
                        goal_id = str(goal.get('GoalId', ''))
                        if goal_id:
                            goal_ids_in_campaign.add(goal_id)
                
                # Добавляем все найденные цели в общий словарь
                for goal_id in goal_ids_in_campaign:
                    if goal_id and goal_id not in goals_map:
                        goals_map[goal_id] = {
                            'id': goal_id,
                            'name': f'Цель {goal_id}',
                            'campaigns': []
                        }
                    
                    if goal_id:
                        goals_map[goal_id]['campaigns'].append({
                            'id': campaign_id,
                            'name': campaign_name
                        })
            
            # Преобразуем в список
            goals_from_campaigns = list(goals_map.values())
            
            print(f'[DEBUG] Total unique goals from campaigns: {len(goals_from_campaigns)}')
            
            # Пытаемся обогатить данные из Метрики (названия целей и счётчиков)
            try:
                print('[DEBUG] Attempting to enrich goals with Metrika data...')
                
                # Получаем список счётчиков
                counters_url = 'https://api-metrika.yandex.net/management/v1/counters'
                metrika_headers = {'Authorization': f'OAuth {token}'}
                counters_response = requests.get(counters_url, headers=metrika_headers, timeout=10)
                
                print(f'[DEBUG] Metrika counters response: {counters_response.status_code}')
                
                if counters_response.status_code == 200:
                    counters_data = counters_response.json()
                    counters = counters_data.get('counters', [])
                    
                    print(f'[DEBUG] Found {len(counters)} Metrika counters')
                    
                    # Создаём словарь счётчиков
                    counters_map = {str(c['id']): c.get('name', f"Счётчик {c['id']}") for c in counters}
                    
                    # Для каждого счётчика получаем цели
                    goals_details = {}
                    for counter in counters:
                        counter_id = counter['id']
                        counter_name = counter.get('name', f'Счётчик {counter_id}')
                        
                        goals_url = f'https://api-metrika.yandex.net/management/v1/counter/{counter_id}/goals'
                        goals_response = requests.get(goals_url, headers=metrika_headers, timeout=10)
                        
                        if goals_response.status_code == 200:
                            goals_data = goals_response.json()
                            counter_goals = goals_data.get('goals', [])
                            
                            print(f'[DEBUG] Counter {counter_id} ({counter_name}): {len(counter_goals)} goals')
                            
                            for goal in counter_goals:
                                goal_id_str = str(goal.get('id', ''))
                                if goal_id_str:
                                    goals_details[goal_id_str] = {
                                        'name': goal.get('name', f'Цель {goal_id_str}'),
                                        'counter_id': str(counter_id),
                                        'counter_name': counter_name,
                                        'type': goal.get('type', 'unknown')
                                    }
                    
                    print(f'[DEBUG] Enriched {len(goals_details)} goals from Metrika')
                    
                    # Обогащаем цели данными из Метрики
                    for goal in goals_from_campaigns:
                        goal_id = goal['id']
                        if goal_id in goals_details:
                            goal['name'] = goals_details[goal_id]['name']
                            goal['counter_id'] = goals_details[goal_id]['counter_id']
                            goal['counter_name'] = goals_details[goal_id]['counter_name']
                            goal['type'] = goals_details[goal_id]['type']
                        else:
                            # Если цель не найдена в Метрике, оставляем ID
                            goal['name'] = f"Цель {goal_id}"
                            goal['counter_name'] = "Неизвестный счётчик"
                    
                    print(f'[DEBUG] Successfully enriched goals with Metrika data')
                    
                else:
                    print(f'[WARN] Cannot access Metrika API (status {counters_response.status_code}). Using goal IDs only.')
                    # Если нет доступа к Метрике, используем только ID
                    for goal in goals_from_campaigns:
                        goal['name'] = f"Цель {goal['id']}"
                        goal['counter_name'] = "Требуется доступ к Метрике"
                        
            except Exception as metrika_error:
                print(f'[ERROR] Failed to enrich with Metrika: {metrika_error}')
                # В случае ошибки используем ID
                for goal in goals_from_campaigns:
                    if 'name' not in goal or not goal['name']:
                        goal['name'] = f"Цель {goal['id']}"
                    if 'counter_name' not in goal:
                        goal['counter_name'] = "Ошибка загрузки"
            
            all_goals = goals_from_campaigns
            print(f'[DEBUG] Final goals count: {len(all_goals)}')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'goals': all_goals})
            }
        
        except Exception as e:
            print(f'[ERROR] Failed to load goals: {str(e)}')
            import traceback
            print(f'[ERROR] Traceback: {traceback.format_exc()}')
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': str(e)})
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
                        'FieldNames': ['Id', 'Name', 'Type', 'Status'],
                        'TextCampaignFieldNames': ['BiddingStrategy'],
                        'DynamicTextCampaignFieldNames': ['BiddingStrategy']
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
            
            print(f'[DEBUG] Found {len(campaigns_raw)} campaigns total')
            
            # Фильтруем кампании - оставляем только РСЯ (Network активна, Search отключен SERVING_OFF)
            rsya_campaigns_raw = []
            for c in campaigns_raw:
                campaign_type = c.get('Type')
                is_rsya = False
                
                # Проверяем TEXT_CAMPAIGN
                if campaign_type == 'TEXT_CAMPAIGN':
                    text_campaign = c.get('TextCampaign', {})
                    bidding_strategy = text_campaign.get('BiddingStrategy', {})
                    
                    # Проверяем стратегии на поиске и в сетях
                    search_strategy = bidding_strategy.get('Search', {})
                    network_strategy = bidding_strategy.get('Network', {})
                    
                    # Проверяем типы стратегий
                    search_type = search_strategy.get('BiddingStrategyType', '')
                    network_type = network_strategy.get('BiddingStrategyType', '')
                    
                    # РСЯ = поиск SERVING_OFF И сети активны (не SERVING_OFF)
                    search_disabled = search_type == 'SERVING_OFF'
                    network_enabled = network_type != 'SERVING_OFF' and network_type != ''
                    
                    is_rsya = search_disabled and network_enabled
                    
                    print(f'[DEBUG] Campaign {c.get("Id")} "{c.get("Name")}": search_type={search_type}, network_type={network_type}, is_rsya={is_rsya}')
                
                # Проверяем DYNAMIC_TEXT_CAMPAIGN
                elif campaign_type == 'DYNAMIC_TEXT_CAMPAIGN':
                    dynamic_campaign = c.get('DynamicTextCampaign', {})
                    bidding_strategy = dynamic_campaign.get('BiddingStrategy', {})
                    
                    search_strategy = bidding_strategy.get('Search', {})
                    network_strategy = bidding_strategy.get('Network', {})
                    
                    search_type = search_strategy.get('BiddingStrategyType', '')
                    network_type = network_strategy.get('BiddingStrategyType', '')
                    
                    search_disabled = search_type == 'SERVING_OFF'
                    network_enabled = network_type != 'SERVING_OFF' and network_type != ''
                    
                    is_rsya = search_disabled and network_enabled
                    
                    print(f'[DEBUG] Dynamic Campaign {c.get("Id")} "{c.get("Name")}": search_type={search_type}, network_type={network_type}, is_rsya={is_rsya}')
                
                if is_rsya:
                    rsya_campaigns_raw.append(c)
            
            print(f'[DEBUG] Filtered to {len(rsya_campaigns_raw)} RSA campaigns')
            
            # Собираем ID отфильтрованных кампаний для Reports API
            text_campaigns = []
            for c in rsya_campaigns_raw:
                campaign_type = c.get('Type')
                if campaign_type in ['TEXT_CAMPAIGN', 'DYNAMIC_TEXT_CAMPAIGN']:
                    text_campaigns.append({
                        'id': str(c.get('Id')),
                        'name': c.get('Name', 'Без названия'),
                        'status': c.get('Status', 'UNKNOWN')
                    })
            
            # Один запрос Reports API для ВСЕХ кампаний сразу
            all_platforms_by_campaign = {}
            all_goals_by_campaign = {}
            
            if text_campaigns:
                campaign_ids = [int(tc['id']) for tc in text_campaigns]
                
                try:
                    reports_url = 'https://api-sandbox.direct.yandex.com/json/v5/reports' if is_sandbox else 'https://api.direct.yandex.com/json/v5/reports'
                    
                    report_body = {
                        'params': {
                            'SelectionCriteria': {
                                'Filter': [
                                    {'Field': 'CampaignId', 'Operator': 'IN', 'Values': campaign_ids}
                                ],
                                'DateFrom': '2024-10-01',
                                'DateTo': '2024-11-01'
                            },
                            'FieldNames': [
                                'CampaignId',
                                'Placement',
                                'Impressions',
                                'Clicks',
                                'Cost',
                                'Conversions'
                            ],
                            'ReportName': f'RSYAPlatforms_All_{context.request_id[:8]}',
                            'ReportType': 'CUSTOM_REPORT',
                            'DateRangeType': 'CUSTOM_DATE',
                            'Format': 'TSV',
                            'IncludeVAT': 'NO',
                            'IncludeDiscount': 'NO'
                        }
                    }
                    
                    report_headers = dict(request_headers)
                    report_headers['Accept-Language'] = 'ru'
                    report_headers['processingMode'] = 'auto'
                    report_headers['returnMoneyInMicros'] = 'false'
                    report_headers['skipReportHeader'] = 'true'
                    report_headers['skipReportSummary'] = 'true'
                    
                    print(f'[DEBUG] Requesting Reports API for {len(campaign_ids)} campaigns')
                    
                    report_response = requests.post(
                        reports_url,
                        headers=report_headers,
                        json=report_body,
                        timeout=60
                    )
                    
                    print(f'[DEBUG] Reports API response status: {report_response.status_code}')
                    
                    # Пропускаем retry для избежания ошибок - в следующий раз отчёт будет готов
                    if report_response.status_code == 201:
                        print(f'[DEBUG] Report queued - will be ready on next request')
                    
                    if report_response.status_code == 200:
                        report_text = report_response.text
                        print(f'[DEBUG] Reports API response preview: {report_text[:500]}')
                        
                        # Парсим TSV и группируем по CampaignId
                        lines = report_text.strip().split('\n')
                        if len(lines) > 1:
                            headers_line = lines[0].split('\t')
                            
                            # Группируем данные по кампаниям
                            for line in lines[1:]:
                                values = line.split('\t')
                                if len(values) < len(headers_line):
                                    continue
                                
                                row = dict(zip(headers_line, values))
                                campaign_id_str = row.get('CampaignId', '')
                                platform_name = row.get('Placement', '--')
                                
                                if not campaign_id_str or platform_name == '--':
                                    continue
                                
                                # Инициализируем структуры для кампании
                                if campaign_id_str not in all_platforms_by_campaign:
                                    all_platforms_by_campaign[campaign_id_str] = {}
                                    all_goals_by_campaign[campaign_id_str] = {}
                                
                                impressions = int(row.get('Impressions', 0) or 0)
                                clicks = int(row.get('Clicks', 0) or 0)
                                cost = float(row.get('Cost', 0) or 0)
                                conversions = int(row.get('Conversions', 0) or 0)
                                goal_id = row.get('GoalId', '')
                                
                                # Добавляем площадку для данной кампании
                                if platform_name not in all_platforms_by_campaign[campaign_id_str]:
                                    all_platforms_by_campaign[campaign_id_str][platform_name] = {
                                        'impressions': 0,
                                        'clicks': 0,
                                        'cost': 0,
                                        'conversions': 0,
                                        'goals': {}
                                    }
                                
                                all_platforms_by_campaign[campaign_id_str][platform_name]['impressions'] += impressions
                                all_platforms_by_campaign[campaign_id_str][platform_name]['clicks'] += clicks
                                all_platforms_by_campaign[campaign_id_str][platform_name]['cost'] += cost
                                all_platforms_by_campaign[campaign_id_str][platform_name]['conversions'] += conversions
                                
                                # Добавляем статистику по целям
                                if goal_id and goal_id != '--':
                                    if goal_id not in all_goals_by_campaign[campaign_id_str]:
                                        all_goals_by_campaign[campaign_id_str][goal_id] = {'name': f'Цель {goal_id}', 'id': goal_id}
                                    
                                    if goal_id not in all_platforms_by_campaign[campaign_id_str][platform_name]['goals']:
                                        all_platforms_by_campaign[campaign_id_str][platform_name]['goals'][goal_id] = {
                                            'conversions': 0
                                        }
                                    all_platforms_by_campaign[campaign_id_str][platform_name]['goals'][goal_id]['conversions'] += conversions
                            
                            print(f'[DEBUG] Parsed data for {len(all_platforms_by_campaign)} campaigns from Reports API')
                    else:
                        print(f'[DEBUG] Reports API failed: {report_response.text[:500]}')
                
                except Exception as e:
                    print(f'[DEBUG] Failed to fetch reports: {str(e)}')
            
            # Формируем список кампаний с их площадками и целями
            # Используем rsya_campaigns_raw (уже отфильтрованные по BiddingStrategy)
            campaigns = []
            for c in rsya_campaigns_raw:
                campaign_type = c.get('Type')
                campaign_id = str(c.get('Id'))
                
                if campaign_type not in ['TEXT_CAMPAIGN', 'DYNAMIC_TEXT_CAMPAIGN']:
                    continue
                
                platforms = []
                goals = []
                
                # Получаем данные из сгруппированных результатов
                if campaign_id in all_platforms_by_campaign:
                    platforms_data = all_platforms_by_campaign[campaign_id]
                    goals_data = all_goals_by_campaign.get(campaign_id, {})
                    
                    # Формируем список целей для кампании
                    goals = [{'id': gid, 'name': gdata['name'], 'type': 'GOAL'} for gid, gdata in goals_data.items()]
                    
                    # Формируем список площадок для кампании
                    for platform_name, pdata in platforms_data.items():
                        clicks = pdata['clicks']
                        impressions = pdata['impressions']
                        cost = pdata['cost']
                        conversions = pdata['conversions']
                        
                        # Расчёт метрик
                        ctr = round((clicks / impressions) * 100, 2) if impressions > 0 else 0
                        cpc = round(cost / clicks, 2) if clicks > 0 else 0
                        conversion_rate = round((conversions / clicks) * 100, 2) if clicks > 0 else 0
                        
                        # Статистика по целям
                        goals_stats = {}
                        for goal_id, goal_data in pdata['goals'].items():
                            goal_conv = goal_data['conversions']
                            goals_stats[goal_id] = {
                                'conversions': goal_conv,
                                'conversion_rate': round((goal_conv / clicks) * 100, 2) if clicks > 0 else 0,
                                'cost_per_goal': round(cost / goal_conv, 2) if goal_conv > 0 else 0
                            }
                        
                        platforms.append({
                            'adgroup_id': platform_name,
                            'adgroup_name': platform_name,
                            'status': 'ACCEPTED',
                            'network_enabled': True,
                            'stats': {
                                'impressions': impressions,
                                'clicks': clicks,
                                'ctr': ctr,
                                'cost': cost,
                                'cpc': cpc,
                                'conversions': conversions,
                                'conversion_rate': conversion_rate,
                                'avg_position': 0,
                                'goals': goals_stats
                            }
                        })
                    
                    print(f'[DEBUG] Campaign {campaign_id}: {len(platforms)} platforms, {len(goals)} goals')
                
                # Если площадок нет и это sandbox, добавляем тестовые данные
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