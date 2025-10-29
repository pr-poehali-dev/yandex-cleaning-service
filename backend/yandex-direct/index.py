import json
import os
from typing import Dict, Any, List
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Работа с API Яндекс.Директ - получение кампаний РСЯ
    Args: event - dict с httpMethod, queryStringParameters, body
          context - объект с request_id
    Returns: HTTP response dict с данными кампаний
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # CORS OPTIONS
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
    
    # GET /campaigns - получить кампании РСЯ
    if method == 'GET':
        headers = event.get('headers', {})
        token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
        
        if not token:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Отсутствует токен авторизации'})
            }
        
        try:
            response = requests.post(
                'https://api.direct.yandex.com/json/v5/campaigns',
                headers={
                    'Authorization': f'Bearer {token}',
                    'Accept-Language': 'ru',
                    'Client-Login': 'your-login'
                },
                json={
                    'method': 'get',
                    'params': {
                        'SelectionCriteria': {
                            'Types': ['TEXT_AD_NETWORK']
                        },
                        'FieldNames': ['Id', 'Name', 'Type', 'Status', 'State']
                    }
                }
            )
            
            if response.status_code != 200:
                return {
                    'statusCode': response.status_code,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Ошибка API Яндекс.Директ', 'details': response.text})
                }
            
            data = response.json()
            campaigns_raw = data.get('result', {}).get('Campaigns', [])
            
            campaigns = []
            for c in campaigns_raw:
                campaigns.append({
                    'id': str(c.get('Id')),
                    'name': c.get('Name'),
                    'type': c.get('Type'),
                    'status': c.get('Status')
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'campaigns': campaigns})
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Ошибка запроса: {str(e)}'})
            }
    
    # POST /clean - запустить чистку площадок
    if method == 'POST':
        headers = event.get('headers', {})
        token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
        
        if not token:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Отсутствует токен авторизации'})
            }
        
        body_data = json.loads(event.get('body', '{}'))
        campaign_ids = body_data.get('campaignIds', [])
        filters = body_data.get('filters', [])
        
        if not campaign_ids:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Не указаны ID кампаний'})
            }
        
        if not filters:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Не указаны фильтры'})
            }
        
        # TODO: Реальная логика чистки через API Яндекс.Директ
        # 1. Получить площадки кампаний
        # 2. Отфильтровать по паттернам
        # 3. Отключить через API
        
        # Mock результат
        result = {
            'disabled': 247,
            'total': 1520,
            'campaignsProcessed': len(campaign_ids)
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Метод не поддерживается'})
    }