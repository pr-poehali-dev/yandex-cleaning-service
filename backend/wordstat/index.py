import json
import os
from typing import Dict, Any, List
import hashlib

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение данных о частотности запросов (демо-режим с прогнозом)
    Args: event - dict с httpMethod, body (keywords: List[str], regions: List[int])
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с данными о частотности запросов
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
    
    if method == 'POST':
        body_str = event.get('body', '{}')
        if not body_str or body_str.strip() == '':
            body_str = '{}'
        body_data = json.loads(body_str)
        keywords: List[str] = body_data.get('keywords', [])
        
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
            hash_val = int(hashlib.md5(keyword.encode()).hexdigest()[:8], 16)
            base_shows = 5000 + (hash_val % 50000)
            length_modifier = max(1, 4 - len(keyword.split()))
            estimated_shows = int(base_shows * length_modifier)
            
            search_query.append({
                'Keyword': keyword,
                'Shows': estimated_shows
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
                'data': {
                    'SearchQuery': search_query
                },
                'note': 'ДЕМО-РЕЖИМ: Показаны прогнозные значения. Для реальных данных нужен боевой токен Яндекс.Директ с доступом к Wordstat API'
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
