import json
import os
from typing import Dict, Any, List
import requests
from collections import defaultdict

def clusterize_keywords(phrases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    '''
    Умная кластеризация по смысловой близости и коммерческим намерениям
    '''
    stop_words = {
        'в', 'на', 'с', 'по', 'для', 'из', 'и', 'или', 'как', 'что', 'за', 
        'это', 'то', 'так', 'но', 'а', 'о', 'у', 'от', 'к', 'до'
    }
    
    commercial_words = {
        'купить': 'Коммерческие (покупка)',
        'цена': 'Коммерческие (цена)',
        'заказать': 'Коммерческие (заказ)',
        'доставка': 'Коммерческие (доставка)',
        'недорого': 'Коммерческие (цена)',
        'дешево': 'Коммерческие (цена)',
        'стоимость': 'Коммерческие (цена)',
        'интернет': 'Коммерческие (онлайн)',
        'магазин': 'Коммерческие (онлайн)',
        'сайт': 'Коммерческие (онлайн)'
    }
    
    info_words = {
        'как': 'Информационные (инструкции)',
        'что': 'Информационные (определения)',
        'почему': 'Информационные (причины)',
        'где': 'Информационные (местоположение)',
        'когда': 'Информационные (время)',
        'отзывы': 'Информационные (отзывы)',
        'рейтинг': 'Информационные (рейтинги)',
        'лучший': 'Информационные (рейтинги)',
        'сравнение': 'Информационные (сравнение)'
    }
    
    clusters = defaultdict(lambda: {
        'phrases': [], 
        'total_count': 0,
        'avg_words': 0,
        'intent': 'Общие'
    })
    
    for phrase_data in phrases:
        phrase = phrase_data['phrase'].lower()
        words = phrase.split()
        
        keywords_in_phrase = [w for w in words if w not in stop_words and len(w) > 2]
        
        if not keywords_in_phrase:
            keywords_in_phrase = words[:1] if words else ['другое']
        
        cluster_key = None
        intent = 'Общие'
        
        for word in keywords_in_phrase:
            if word in commercial_words:
                cluster_key = commercial_words[word]
                intent = 'commercial'
                break
            elif word in info_words:
                cluster_key = info_words[word]
                intent = 'informational'
                break
        
        if not cluster_key:
            main_keyword = sorted(keywords_in_phrase, key=lambda w: len(w), reverse=True)[0]
            cluster_key = main_keyword.capitalize()
        
        clusters[cluster_key]['phrases'].append(phrase_data)
        clusters[cluster_key]['total_count'] += phrase_data['count']
        clusters[cluster_key]['intent'] = intent
    
    result = []
    for cluster_name, data in sorted(clusters.items(), key=lambda x: x[1]['total_count'], reverse=True):
        phrases_list = data['phrases']
        avg_words = sum(len(p['phrase'].split()) for p in phrases_list) / len(phrases_list)
        max_count = max(p['count'] for p in phrases_list)
        min_count = min(p['count'] for p in phrases_list)
        
        result.append({
            'cluster_name': cluster_name,
            'total_count': data['total_count'],
            'phrases_count': len(phrases_list),
            'avg_words': round(avg_words, 1),
            'max_frequency': max_count,
            'min_frequency': min_count,
            'intent': data['intent'],
            'phrases': sorted(phrases_list, key=lambda x: x['count'], reverse=True)
        })
    
    return result

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение реальных данных из Яндекс.Wordstat API
    Args: event - dict с httpMethod, body (keywords: List[str], regions: List[int])
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с реальными данными о частотности запросов
    '''
    method: str = event.get('httpMethod', 'GET')
    
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
    
    token = os.environ.get('YANDEX_WORDSTAT_TOKEN')
    if not token:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Токен не настроен. Добавьте YANDEX_WORDSTAT_TOKEN.'})
        }
    
    if method == 'POST':
        body_str = event.get('body', '{}')
        if not body_str or body_str.strip() == '':
            body_str = '{}'
        body_data = json.loads(body_str)
        keywords: List[str] = body_data.get('keywords', [])
        regions: List[int] = body_data.get('regions', [213])
        
        if not keywords:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Необходимо указать ключевые слова'})
            }
        
        api_url = 'https://api.wordstat.yandex.net/v1/topRequests'
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Language': 'ru'
        }
        
        try:
            payload = {
                'phrase': keywords[0],
                'regions': regions
            }
            
            response = requests.post(api_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code != 200:
                return {
                    'statusCode': response.status_code,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': f'API error: {response.status_code}'})
                }
            
            data = response.json()
            
            if 'error' in data:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': data.get('error')})
                }
            
            top_requests = data.get('topRequests', [])
            print(f'Got {len(top_requests)} phrases')
            
            clusters = clusterize_keywords(top_requests)
            print(f'Created {len(clusters)} clusters')
            
            search_query = [{
                'Keyword': keywords[0],
                'Shows': top_requests[0]['count'] if top_requests else 0,
                'TopRequests': top_requests,
                'Clusters': clusters
            }]
        
        except requests.exceptions.Timeout:
            return {
                'statusCode': 504,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Превышено время ожидания ответа от API'})
            }
        except Exception as e:
            print(f'Exception: {str(e)}')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': f'Ошибка: {str(e)}'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'data': {'SearchQuery': search_query}
            })
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Метод не поддерживается'})
    }