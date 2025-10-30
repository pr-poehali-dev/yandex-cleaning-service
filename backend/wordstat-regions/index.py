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
    
    oauth_token = os.environ.get('YANDEX_WORDSTAT_TOKEN')
    print(f'[DEBUG] Token exists: {bool(oauth_token)}, length: {len(oauth_token) if oauth_token else 0}')
    
    if not oauth_token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'YANDEX_WORDSTAT_TOKEN not configured'}),
            'isBase64Encoded': False
        }
    
    url = 'https://api.wordstat.yandex.net/v1/getRegionsTree'
    
    headers = {
        'Authorization': f'Bearer {oauth_token}',
        'Content-Type': 'application/json;charset=utf-8'
    }
    
    response = requests.post(url, headers=headers, json={}, timeout=30)
    
    print(f'[DEBUG] API response status: {response.status_code}')
    print(f'[DEBUG] API response body: {response.text[:500]}')
    
    if response.status_code != 200:
        return {
            'statusCode': response.status_code,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Wordstat API error: {response.text}'}),
            'isBase64Encoded': False
        }
    
    data = response.json()
    
    print(f'[DEBUG] Raw API response: {json.dumps(data)[:500]}')
    
    def flatten_regions(regions_tree, parent_id=None):
        result = []
        for region in regions_tree:
            region_id = region.get('value') or region.get('id')
            region_name = region.get('label') or region.get('name')
            
            result.append({
                'id': int(region_id) if region_id else None,
                'name': region_name,
                'parent_id': parent_id
            })
            
            children = region.get('children')
            if children and isinstance(children, list):
                result.extend(flatten_regions(children, int(region_id) if region_id else None))
        return result
    
    regions_data = data if isinstance(data, list) else data.get('regions', [])
    all_regions = flatten_regions(regions_data)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'regions': all_regions}),
        'isBase64Encoded': False
    }