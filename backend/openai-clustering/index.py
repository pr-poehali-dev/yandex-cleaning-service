'''
Business: Кластеризация фраз через OpenAI GPT-4o-mini
Args: event - dict с httpMethod, body (phrases: List[str], mode: str)
Returns: HTTP response с кластеризованными данными
'''

import json
import os
from typing import Dict, Any, List
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'OPENAI_API_KEY not configured'})
        }
    
    body_str = event.get('body', '{}')
    body_data = json.loads(body_str)
    phrases: List[Dict[str, Any]] = body_data.get('phrases', [])
    mode: str = body_data.get('mode', 'context')
    
    if not phrases:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phrases required'})
        }
    
    phrases_text = '\n'.join([f"{p['phrase']} ({p['count']} показов)" for p in phrases[:200]])
    
    prompt = f"""Ты эксперт по кластеризации поисковых запросов для {'контекстной рекламы' if mode == 'context' else 'SEO'}.

Проанализируй фразы и раздели их на кластеры по смыслу и интенту пользователя.

Правила кластеризации:
- {'Узкие кластеры (5-15 фраз) для точного таргетинга рекламы' if mode == 'context' else 'Широкие кластеры (10-30 фраз) для контентных страниц'}
- Название кластера должно отражать главный интент
- Отдели минус-слова (бесплатно, скачать, игра, порно, работа, вакансия)

Фразы:
{phrases_text}

Верни JSON в формате:
{{
  "clusters": [
    {{
      "cluster_name": "Название кластера",
      "intent": "commercial/informational/navigational",
      "phrases": [
        {{"phrase": "текст фразы", "count": число}}
      ]
    }}
  ],
  "minus_words": ["слово1", "слово2"]
}}"""
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {openai_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4o-mini',
                'messages': [
                    {'role': 'system', 'content': 'Ты эксперт по кластеризации поисковых запросов. Всегда отвечаешь только валидным JSON.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'response_format': {'type': 'json_object'}
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return {
                'statusCode': response.status_code,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'OpenAI API error: {response.status_code}', 'details': response.text})
            }
        
        data = response.json()
        content = data['choices'][0]['message']['content']
        result = json.loads(content)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
