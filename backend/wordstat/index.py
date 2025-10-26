import json
import os
from typing import Dict, Any, List
import requests

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
        
        search_query = []
        
        for keyword in keywords:
            api_url = 'https://api.wordstat.yandex.net/v1/topRequests'
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json; charset=utf-8',
                'Accept-Language': 'ru'
            }
            
            all_top_requests = []
            page_size = 50
            max_pages = 40
            
            try:
                for page in range(max_pages):
                    offset = page * page_size
                    
                    payload = {
                        'phrase': keyword,
                        'regions': regions,
                        'limit': page_size,
                        'offset': offset
                    }
                    
                    print(f'Fetching page {page + 1}/{max_pages}, offset={offset}')
                    response = requests.post(api_url, json=payload, headers=headers, timeout=30)
                    
                    if response.status_code != 200:
                        print(f'API error on page {page + 1}: {response.status_code}')
                        break
                    
                    data = response.json()
                    
                    if 'error' in data:
                        error_msg = data.get('error', 'Ошибка API')
                        print(f'API Error: {error_msg}')
                        break
                    
                    page_requests = data.get('topRequests', [])
                    
                    if not page_requests:
                        print(f'No more results on page {page + 1}')
                        break
                    
                    all_top_requests.extend(page_requests)
                    print(f'Page {page + 1}: got {len(page_requests)} requests, total: {len(all_top_requests)}')
                    
                    if len(page_requests) < page_size:
                        print(f'Last page reached (got {len(page_requests)} < {page_size})')
                        break
                
                total_shows = data.get('totalCount', 0) if 'data' in locals() else 0
                
                search_query.append({
                    'Keyword': keyword,
                    'Shows': total_shows,
                    'TopRequests': all_top_requests
                })
                    
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