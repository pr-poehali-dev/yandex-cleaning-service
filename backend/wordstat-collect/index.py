import json
import os
from typing import Dict, Any
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def check_subscription(user_id: str) -> bool:
    try:
        dsn = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        cur.execute(
            "SELECT * FROM subscriptions WHERE user_id = %s",
            (user_id,)
        )
        subscription = cur.fetchone()
        cur.close()
        conn.close()
        
        if not subscription:
            return False
        
        now = datetime.now()
        
        if subscription['plan_type'] == 'trial':
            if subscription['trial_ends_at'] and now < subscription['trial_ends_at']:
                return True
        elif subscription['plan_type'] == 'monthly':
            if subscription['subscription_ends_at'] and now < subscription['subscription_ends_at']:
                return True
        
        return False
    except Exception:
        return False

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Сбор ключевых фраз из Wordstat API v1
    Args: event - dict с httpMethod (POST), body с phrase, regions[], headers с X-User-Id
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с массивом phrases [{phrase, count}]
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    if not check_subscription(user_id):
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Subscription required', 'code': 'SUBSCRIPTION_REQUIRED'}),
            'isBase64Encoded': False
        }
    
    oauth_token = os.environ.get('YANDEX_WORDSTAT_TOKEN')
    if not oauth_token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'YANDEX_WORDSTAT_TOKEN not configured'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    phrase = body_data.get('phrase', '')
    regions = body_data.get('regions', [213])
    
    if not phrase:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phrase is required'}),
            'isBase64Encoded': False
        }
    
    url = 'https://api.wordstat.yandex.net/v1/getKeywordsSuggestion'
    
    headers = {
        'Authorization': f'Bearer {oauth_token}',
        'Content-Type': 'application/json;charset=utf-8'
    }
    
    payload = {
        'phrase': phrase,
        'geo': regions if isinstance(regions, list) else [regions],
        'limit': 500
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    
    if response.status_code != 200:
        return {
            'statusCode': response.status_code,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Wordstat API error: {response.text}'}),
            'isBase64Encoded': False
        }
    
    data = response.json()
    
    phrases = []
    if 'phrases' in data:
        for item in data['phrases']:
            phrases.append({
                'phrase': item.get('phrase', ''),
                'count': item.get('shows', 0)
            })
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'phrases': phrases}),
        'isBase64Encoded': False
    }