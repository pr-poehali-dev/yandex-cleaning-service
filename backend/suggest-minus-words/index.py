import json
import os
from typing import Dict, Any, List
from openai import OpenAI

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Анализирует все ключевые фразы и предлагает минус-слова через OpenAI
    Args: event с httpMethod, body (JSON с ключами phrases: List[str])
          context с request_id
    Returns: HTTP response с предложенными минус-словами
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    phrases: List[str] = body_data.get('phrases', [])
    
    if not phrases:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'No phrases provided'}),
            'isBase64Encoded': False
        }
    
    api_key = os.environ.get('OPENAI_API_KEY')
    proxy_url = os.environ.get('OPENAI_PROXY_URL')
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'OpenAI API key not configured'}),
            'isBase64Encoded': False
        }
    
    client_kwargs = {'api_key': api_key}
    if proxy_url:
        import httpx
        client_kwargs['http_client'] = httpx.Client(proxy=proxy_url)
    
    client = OpenAI(**client_kwargs)
    
    phrases_sample = phrases[:100] if len(phrases) > 100 else phrases
    phrases_text = '\n'.join(phrases_sample)
    
    prompt = f"""Проанализируй следующие ключевые фразы для контекстной рекламы и SEO.

Ключевые фразы:
{phrases_text}

Задача: Найди фразы, которые явно НЕ относятся к основной тематике и должны быть исключены как минус-слова.

Примеры минус-слов:
- "бесплатно" (если продаём платный продукт)
- "скачать" (если предлагаем онлайн-сервис)
- "своими руками" (если продаём готовое решение)
- "вакансии", "работа" (если не HR-сфера)
- названия других городов (если локальный бизнес)

Верни ТОЛЬКО JSON массив строк (минус-слов), БЕЗ дополнительного текста:
["минус-слово1", "минус-слово2", ...]

Если не нашёл явных минус-слов, верни пустой массив: []"""

    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {
                'role': 'system',
                'content': 'Ты эксперт по контекстной рекламе. Анализируешь ключевые фразы и находишь минус-слова.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ],
        temperature=0.3,
        max_tokens=500
    )
    
    content = response.choices[0].message.content.strip()
    
    if content.startswith('```'):
        content = content.split('```')[1]
        if content.startswith('json'):
            content = content[4:]
        content = content.strip()
    
    suggested_minus = json.loads(content)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'suggestedMinusWords': suggested_minus,
            'analyzedCount': len(phrases_sample),
            'totalCount': len(phrases)
        }),
        'isBase64Encoded': False
    }
