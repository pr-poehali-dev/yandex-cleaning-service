import json
import os
from typing import Dict, Any
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение списка регионов из Wordstat API
    Args: event - dict с httpMethod (GET)
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с массивом регионов {id, name}
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        api_key = os.environ.get('YANDEX_WORDSTAT_TOKEN')
        if not api_key:
            raise ValueError('YANDEX_WORDSTAT_TOKEN not configured')
        
        url = 'https://api.direct.yandex.com/live/v4/json/'
        
        payload = {
            'method': 'GetRegions',
            'token': api_key,
            'param': {}
        }
        
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if 'data' in data:
            regions = []
            for region in data['data']:
                regions.append({
                    'id': region.get('RegionID'),
                    'name': region.get('RegionName'),
                    'parent_id': region.get('ParentID')
                })
            
            major_regions = [r for r in regions if r.get('parent_id') == 0 or r['id'] in [1, 213, 2, 10174]]
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'regions': major_regions}),
                'isBase64Encoded': False
            }
        else:
            raise ValueError(f'Unexpected API response: {data}')
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
