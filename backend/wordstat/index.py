import json
import os
from typing import Dict, Any, List
import requests
import time

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
    
    token = os.environ.get('YANDEX_WORDSTAT_TOKEN') or os.environ.get('YANDEX_DIRECT_TOKEN')
    if not token:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Токен не настроен. Добавьте YANDEX_WORDSTAT_TOKEN или YANDEX_DIRECT_TOKEN.'})
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
        
        api_url = 'https://api.direct.yandex.ru/v4/json/'
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        payload = {
            'method': 'CreateNewWordstatReport',
            'token': token,
            'param': {
                'Phrases': keywords,
                'GeoID': regions
            }
        }
        
        try:
            payload_json = json.dumps(payload, ensure_ascii=False)
            response = requests.post(api_url, data=payload_json.encode('utf-8'), headers=headers, timeout=10)
            
            if response.status_code != 200:
                return {
                    'statusCode': response.status_code,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'error': 'Ошибка создания отчёта',
                        'details': response.text,
                        'status': response.status_code
                    })
                }
            
            data = response.json()
            
            if 'error_code' in data:
                error_msg = data.get('error_str', 'Ошибка API')
                error_detail = data.get('error_detail', '')
                error_code = data.get('error_code')
                
                print(f'API Error: {error_code} - {error_msg} - {error_detail}')
                print(f'Token used: {token[:20]}...')
                
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'error': f'{error_msg}: {error_detail}',
                        'code': error_code,
                        'hint': 'Проверьте права доступа токена на https://oauth.yandex.ru'
                    })
                }
            
            if 'data' not in data:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'error': 'Не удалось создать отчёт',
                        'details': data
                    })
                }
            
            report_id = data['data']
            
            time.sleep(2)
            
            max_attempts = 5
            for attempt in range(max_attempts):
                check_payload = {
                    'method': 'GetWordstatReport',
                    'token': token,
                    'param': report_id
                }
                
                check_json = json.dumps(check_payload, ensure_ascii=False)
                report_response = requests.post(api_url, data=check_json.encode('utf-8'), headers=headers, timeout=10)
                
                if report_response.status_code == 200:
                    report_data = report_response.json()
                    
                    if 'data' in report_data:
                        search_query = []
                        for item in report_data['data']:
                            search_query.append({
                                'Keyword': item.get('Phrase', ''),
                                'Shows': item.get('Shows', 0)
                            })
                        
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
                    elif 'error_code' in report_data and report_data['error_code'] == 25:
                        if attempt < max_attempts - 1:
                            time.sleep(2)
                            continue
                
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'error': 'Отчёт не готов, повторите попытку',
                        'details': report_data if 'report_data' in locals() else {}
                    })
                }
                
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
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Метод не поддерживается'})
    }