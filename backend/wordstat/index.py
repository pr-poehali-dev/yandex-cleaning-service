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
            
            payload = {
                'phrase': keyword,
                'regions': regions
            }
            
            try:
                response = requests.post(api_url, json=payload, headers=headers, timeout=30)
                
                print(f'Response status: {response.status_code}')
                print(f'Response body: {response.text[:500]}')
                
                if response.status_code != 200:
                    return {
                        'statusCode': response.status_code,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({
                            'error': 'Ошибка API Wordstat',
                            'details': response.text,
                            'status': response.status_code
                        })
                    }
                
                data = response.json()
                
                if 'error' in data:
                    error_msg = data.get('error', 'Ошибка API')
                    
                    print(f'API Error: {error_msg}')
                    
                    return {
                        'statusCode': 500,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({
                            'error': f'Ошибка Wordstat: {error_msg}',
                            'hint': 'Проверьте токен на https://oauth.yandex.ru'
                        })
                    }
                
                total_shows = data.get('totalCount', 0)
                
                search_query.append({
                    'Keyword': keyword,
                    'Shows': total_shows
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