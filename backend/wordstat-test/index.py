import json
import os
from typing import Dict, Any
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Тестовая функция для проверки прямого ответа API Wordstat
    Args: event - dict с httpMethod
          context - объект с атрибутами request_id
    Returns: HTTP response с сырым ответом от Wordstat API
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Только GET метод'})
        }
    
    token = os.environ.get('YANDEX_WORDSTAT_TOKEN')
    if not token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Токен не найден'})
        }
    
    # Прямой запрос к API
    api_url = 'https://api.wordstat.yandex.net/v1/topRequests'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json; charset=utf-8',
        'Accept-Language': 'ru'
    }
    payload = {
        'phrase': 'купить квартиру',
        'regions': [213]
    }
    
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'apiStatusCode': response.status_code,
                'apiResponse': response.json(),
                'topRequestsCount': len(response.json().get('topRequests', []))
            }, ensure_ascii=False)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
