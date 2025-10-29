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
        
        api_url = 'https://api.wordstat.yandex.net/v1/topRequests'
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Language': 'ru'
        }
        
        all_phrases_dict = {}
        processed_phrases = set()
        phrases_to_process = list(keywords)
        max_iterations = 40
        iteration = 0
        
        try:
            while phrases_to_process and iteration < max_iterations:
                iteration += 1
                current_phrase = phrases_to_process.pop(0)
                
                if current_phrase.lower() in processed_phrases:
                    continue
                
                processed_phrases.add(current_phrase.lower())
                
                print(f'[{iteration}/40] Fetching: "{current_phrase}" (queue: {len(phrases_to_process)}, total: {len(all_phrases_dict)})')
                
                payload = {
                    'phrase': current_phrase,
                    'regions': regions
                }
                
                response = requests.post(api_url, json=payload, headers=headers, timeout=30)
                
                if response.status_code != 200:
                    print(f'API error: {response.status_code}, skipping')
                    continue
                
                data = response.json()
                
                if 'error' in data:
                    print(f'API Error: {data.get("error")}, skipping')
                    continue
                
                top_requests = data.get('topRequests', [])
                print(f'Got {len(top_requests)} requests')
                
                for req in top_requests:
                    phrase_lower = req['phrase'].lower()
                    if phrase_lower not in all_phrases_dict:
                        all_phrases_dict[phrase_lower] = req
                        
                        if len(all_phrases_dict) < 2000 and req['phrase'].lower() not in processed_phrases:
                            phrases_to_process.append(req['phrase'])
            
            print(f'Collection complete: {len(all_phrases_dict)} unique phrases collected')
            
            all_phrases_list = sorted(all_phrases_dict.values(), key=lambda x: x['count'], reverse=True)
            
            search_query = [{
                'Keyword': ', '.join(keywords),
                'Shows': all_phrases_list[0]['count'] if all_phrases_list else 0,
                'TopRequests': all_phrases_list
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