import json
import os
from typing import Dict, Any, List
from openai import OpenAI

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Генерация названий кластеров для ключевых фраз через GPT-4
    Args: event - dict с httpMethod, body (keywords array)
          context - object с request_id
    Returns: HTTP response с массивом названий кластеров
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'isBase64Encoded': False,
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    keywords: List[str] = body_data.get('keywords', [])
    
    if not keywords or len(keywords) == 0:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Keywords array required'})
        }
    
    api_key = os.environ.get('OPENAI_API_KEY')
    proxy_url = os.environ.get('OPENAI_PROXY_URL')
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'OpenAI API key not configured'})
        }
    
    client_kwargs = {'api_key': api_key}
    if proxy_url:
        import httpx
        client_kwargs['http_client'] = httpx.Client(proxies=proxy_url)
    
    client = OpenAI(**client_kwargs)
    
    keywords_text = '\n'.join([f"- {kw}" for kw in keywords[:100]])
    
    prompt = f"""Проанализируй список ключевых фраз и предложи 3-7 названий кластеров (тематических групп).

Ключевые фразы:
{keywords_text}

Требования к названиям:
- Краткие (2-4 слова)
- Понятные для маркетолога
- Отражают коммерческий интент
- На русском языке
- Без технического жаргона

Верни ТОЛЬКО JSON массив строк с названиями, без дополнительного текста:
["Название 1", "Название 2", ...]"""

    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': 'Ты эксперт по маркетингу и кластеризации семантики для контекстной рекламы.'},
            {'role': 'user', 'content': prompt}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    content = response.choices[0].message.content.strip()
    
    if content.startswith('```json'):
        content = content.replace('```json', '').replace('```', '').strip()
    elif content.startswith('```'):
        content = content.replace('```', '').strip()
    
    cluster_names = json.loads(content)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'clusterNames': cluster_names,
            'totalKeywords': len(keywords)
        })
    }