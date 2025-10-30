'''
Business: Get list of regions from Yandex Wordstat API
Args: event - dict with httpMethod
Returns: HTTP response with regions list
'''

import json
import os
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    wordstat_token = os.environ.get('WORDSTAT_TOKEN')
    if not wordstat_token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'WORDSTAT_TOKEN not configured'})
        }
    
    url = 'https://api-sandbox.direct.yandex.ru/v4/json/'
    payload = {
        'method': 'GetRegions',
        'token': wordstat_token
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code != 200:
        return {
            'statusCode': response.status_code,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Wordstat API error', 'details': response.text})
        }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(response.json())
    }
