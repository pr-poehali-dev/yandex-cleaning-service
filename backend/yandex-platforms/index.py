import json
import os
import requests
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение списка площадок из РСЯ кампаний Яндекс Директа
    Args: event - dict with httpMethod, queryStringParameters
          context - object with request_id attribute
    Returns: HTTP response with platforms data
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
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    token = os.environ.get('YANDEX_DIRECT_TOKEN')
    if not token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'YANDEX_DIRECT_TOKEN not configured'})
        }
    
    api_url = 'https://api-sandbox.direct.yandex.com/json/v5/campaigns'
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept-Language': 'ru',
        'Content-Type': 'application/json'
    }
    
    campaigns_payload = {
        'method': 'get',
        'params': {
            'SelectionCriteria': {
                'Types': ['TEXT_CAMPAIGN', 'MOBILE_APP_CAMPAIGN']
            },
            'FieldNames': ['Id', 'Name', 'Type', 'Status', 'State']
        }
    }
    
    try:
        campaigns_response = requests.post(api_url, headers=headers, json=campaigns_payload, timeout=30)
        campaigns_response.raise_for_status()
        campaigns_data = campaigns_response.json()
        
        if 'error' in campaigns_data:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': 'Yandex API error',
                    'details': campaigns_data['error']
                })
            }
        
        campaigns = campaigns_data.get('result', {}).get('Campaigns', [])
        
        stats_url = 'https://api-sandbox.direct.yandex.com/json/v5/reports'
        campaign_ids = [str(camp['Id']) for camp in campaigns[:10]]
        
        if not campaign_ids:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'campaigns': [],
                    'platforms': []
                })
            }
        
        stats_payload = {
            'params': {
                'SelectionCriteria': {
                    'Filter': [
                        {
                            'Field': 'CampaignId',
                            'Operator': 'IN',
                            'Values': campaign_ids
                        }
                    ],
                    'DateFrom': '2024-10-01',
                    'DateTo': '2024-10-31'
                },
                'FieldNames': ['CampaignId', 'Placement', 'Impressions', 'Clicks', 'Cost', 'Conversions'],
                'ReportName': 'Platforms Report',
                'ReportType': 'CUSTOM_REPORT',
                'DateRangeType': 'CUSTOM_DATE',
                'Format': 'TSV',
                'IncludeVAT': 'NO',
                'IncludeDiscount': 'NO'
            }
        }
        
        stats_response = requests.post(stats_url, headers=headers, json=stats_payload, timeout=30)
        
        platforms: List[Dict[str, Any]] = []
        
        if stats_response.status_code == 200:
            lines = stats_response.text.strip().split('\n')
            if len(lines) > 1:
                for line in lines[1:]:
                    parts = line.split('\t')
                    if len(parts) >= 6:
                        impressions = int(parts[2]) if parts[2].isdigit() else 0
                        clicks = int(parts[3]) if parts[3].isdigit() else 0
                        cost = int(parts[4]) if parts[4].isdigit() else 0
                        conversions = int(parts[5]) if parts[5].isdigit() else 0
                        
                        ctr = round((clicks / impressions * 100), 2) if impressions > 0 else 0
                        
                        platforms.append({
                            'campaignId': parts[0],
                            'name': parts[1] if len(parts[1]) > 0 else 'Unknown',
                            'impressions': impressions,
                            'clicks': clicks,
                            'ctr': ctr,
                            'cost': cost,
                            'conversions': conversions,
                            'status': 'active' if ctr > 1.5 else 'low'
                        })
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'campaigns': [{'id': c['Id'], 'name': c['Name'], 'type': c['Type']} for c in campaigns],
                'platforms': platforms,
                'total': len(platforms)
            })
        }
    
    except requests.exceptions.RequestException as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'API request failed', 'details': str(e)})
        }
