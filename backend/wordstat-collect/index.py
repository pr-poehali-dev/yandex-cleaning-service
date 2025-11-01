import json
import os
from typing import Dict, Any
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import uuid

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
    Business: Постраничный сбор ключевых фраз из Wordstat с сохранением в БД
    Args: event - dict с httpMethod (POST), body с keywords[], regions[], page, collection_id
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с collection_id, page, total_pages, phrases, status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
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
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {})
        collection_id = query_params.get('collection_id')
        
        if not collection_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'collection_id required'}),
                'isBase64Encoded': False
            }
        
        dsn = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        cur.execute(
            "SELECT * FROM wordstat_collections WHERE id = %s AND user_id = %s",
            (collection_id, user_id)
        )
        collection = cur.fetchone()
        cur.close()
        conn.close()
        
        if not collection:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Collection not found'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'collection_id': str(collection['id']),
                'status': collection['status'],
                'current_page': collection['current_page'],
                'total_pages': collection['total_pages'],
                'phrases': collection['phrases']
            }),
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
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
    keywords = body_data.get('keywords', [])
    regions = body_data.get('regions', [213])
    page = body_data.get('page', 1)
    collection_id = body_data.get('collection_id')
    mode = body_data.get('mode', 'context')
    
    if not keywords:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Keywords are required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    if not collection_id:
        collection_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO wordstat_collections (id, user_id, keywords, regions, mode, current_page, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (collection_id, user_id, keywords, regions, mode, 0, 'processing')
        )
        conn.commit()
    
    api_url = 'https://suggest-api.poehali.dev/suggest'
    api_headers = {
        'Authorization': f'Bearer {oauth_token}',
        'Content-Type': 'application/json',
        'Accept-Language': 'ru'
    }
    
    num_phrases_per_page = 50
    start_index = (page - 1) * num_phrases_per_page
    
    payload = {
        'phrase': keywords[0],
        'regions': regions,
        'numPhrases': page * num_phrases_per_page
    }
    
    print(f'[COLLECT] Collecting page {page} for "{keywords[0]}" (phrases {start_index}-{start_index + num_phrases_per_page})')
    
    response = requests.post(api_url, json=payload, headers=api_headers, timeout=30)
    
    if response.status_code != 200:
        cur.close()
        conn.close()
        return {
            'statusCode': response.status_code,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'API error: {response.status_code}'}),
            'isBase64Encoded': False
        }
    
    data = response.json()
    top_requests = data.get('topRequests', [])
    
    page_phrases = top_requests[start_index:start_index + num_phrases_per_page] if len(top_requests) > start_index else []
    
    cur.execute(
        "SELECT phrases FROM wordstat_collections WHERE id = %s",
        (collection_id,)
    )
    result = cur.fetchone()
    existing_phrases = result['phrases'] if result and result['phrases'] else []
    
    all_phrases = existing_phrases + page_phrases
    
    total_available = len(top_requests)
    total_pages = (total_available + num_phrases_per_page - 1) // num_phrases_per_page
    is_completed = page >= total_pages or len(page_phrases) < num_phrases_per_page
    
    cur.execute(
        "UPDATE wordstat_collections SET phrases = %s, current_page = %s, total_pages = %s, status = %s, updated_at = NOW() WHERE id = %s",
        (json.dumps(all_phrases), page, total_pages, 'completed' if is_completed else 'processing', collection_id)
    )
    conn.commit()
    
    cur.close()
    conn.close()
    
    print(f'[COLLECT] Saved page {page}/{total_pages}, total phrases: {len(all_phrases)}')
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'collection_id': collection_id,
            'page': page,
            'total_pages': total_pages,
            'phrases': page_phrases,
            'total_collected': len(all_phrases),
            'status': 'completed' if is_completed else 'processing'
        }),
        'isBase64Encoded': False
    }
