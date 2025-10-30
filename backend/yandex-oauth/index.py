import json
import os
from typing import Dict, Any
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: OAuth авторизация через Яндекс для Wordstat API
    Args: event - dict с httpMethod, queryStringParameters (code) или body (code)
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с auth_url или токеном
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        client_id = os.environ.get('YANDEX_DIRECT_CLIENT_ID')
        client_secret = os.environ.get('YANDEX_DIRECT_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            raise ValueError('OAuth credentials not configured')
        
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action')
            
            if action == 'init':
                callback_url = 'https://preview--yandex-cleaning-service.poehali.dev/clustering/oauth-callback'
                
                auth_url = (
                    f'https://oauth.yandex.ru/authorize?'
                    f'response_type=code&'
                    f'client_id={client_id}'
                )
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'auth_url': auth_url, 'client_id': client_id}),
                    'isBase64Encoded': False
                }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            code = body_data.get('code')
            
            if not code:
                raise ValueError('Authorization code required')
            
            token_url = 'https://oauth.yandex.ru/token'
            
            token_payload = {
                'grant_type': 'authorization_code',
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret
            }
            
            token_response = requests.post(token_url, data=token_payload, timeout=30)
            token_response.raise_for_status()
            
            token_data = token_response.json()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'access_token': token_data.get('access_token'),
                    'expires_in': token_data.get('expires_in'),
                    'refresh_token': token_data.get('refresh_token')
                }),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid request'}),
            'isBase64Encoded': False
        }
        
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
