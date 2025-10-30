import json
import os
from typing import Dict, Any, List
import requests
from collections import defaultdict
import math
import pymorphy3

morph = pymorphy3.MorphAnalyzer()

def lemmatize_phrase(phrase: str) -> str:
    '''Лемматизация фразы — приводит слова к начальной форме'''
    words = phrase.lower().split()
    lemmas = []
    for word in words:
        parsed = morph.parse(word)[0]
        lemmas.append(parsed.normal_form)
    return ' '.join(lemmas)

def detect_intent(phrase: str) -> str:
    '''Определяет коммерческий или информационный intent'''
    commercial_markers = [
        'купить', 'цена', 'стоимость', 'заказать', 'доставка', 
        'недорого', 'дешево', 'магазин', 'интернет', 'сайт',
        'продажа', 'скидка', 'акция', 'офис', 'телефон'
    ]
    
    info_markers = [
        'как', 'что', 'где', 'когда', 'почему', 'какой',
        'отзывы', 'рейтинг', 'лучший', 'сравнение', 'инструкция',
        'фото', 'видео', 'статья', 'форум'
    ]
    
    phrase_lower = phrase.lower()
    
    commercial_score = sum(1 for marker in commercial_markers if marker in phrase_lower)
    info_score = sum(1 for marker in info_markers if marker in phrase_lower)
    
    if commercial_score > info_score:
        return 'commercial'
    elif info_score > commercial_score:
        return 'informational'
    else:
        return 'general'

def detect_minus_words(phrases: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    '''
    Автоматическое определение минус-слов для контекстной рекламы
    Возвращает категоризированный список нецелевых запросов
    '''
    minus_categories = {
        'free': {
            'name': '🆓 Бесплатно / Халява',
            'keywords': ['бесплатно', 'бесплатный', 'даром', 'безвозмездно', 'задарма', 'free'],
            'phrases': []
        },
        'diy': {
            'name': '🔧 Своими руками / DIY',
            'keywords': ['своими руками', 'самостоятельно', 'сам', 'самому', 'diy', 'как сделать', 'инструкция'],
            'phrases': []
        },
        'competitors': {
            'name': '🏢 Конкуренты / Площадки',
            'keywords': ['авито', 'циан', 'домклик', 'яндекс недвижимость', 'юла', 'из рук в руки'],
            'phrases': []
        },
        'info': {
            'name': 'ℹ️ Информационные запросы',
            'keywords': ['что такое', 'как выбрать', 'какой лучше', 'отличия', 'разница', 'плюсы минусы', 'советы'],
            'phrases': []
        },
        'job': {
            'name': '💼 Работа / Вакансии',
            'keywords': ['вакансии', 'работа', 'резюме', 'зарплата', 'требуются', 'ищу работу', 'карьера'],
            'phrases': []
        },
        'education': {
            'name': '🎓 Обучение / Курсы',
            'keywords': ['курсы', 'обучение', 'семинар', 'тренинг', 'вебинар', 'мастер класс', 'уроки'],
            'phrases': []
        },
        'download': {
            'name': '📥 Скачать / Загрузить',
            'keywords': ['скачать', 'загрузить', 'download', 'торрент', 'онлайн', 'смотреть'],
            'phrases': []
        },
        'porn': {
            'name': '🔞 Взрослый контент',
            'keywords': ['порно', 'секс', 'xxx', 'эротика', 'интим'],
            'phrases': []
        },
        'other': {
            'name': '❓ Прочие нецелевые',
            'keywords': ['игра', 'игры', 'мультфильм', 'картинки', 'рисунок', 'раскраска', 'шутки', 'анекдоты'],
            'phrases': []
        }
    }
    
    for phrase_data in phrases:
        phrase_lower = phrase_data['phrase'].lower()
        
        matched = False
        for category_key, category_data in minus_categories.items():
            for keyword in category_data['keywords']:
                if keyword in phrase_lower:
                    category_data['phrases'].append(phrase_data)
                    matched = True
                    break
            if matched:
                break
    
    result = {}
    for key, data in minus_categories.items():
        if len(data['phrases']) > 0:
            result[key] = {
                'name': data['name'],
                'count': len(data['phrases']),
                'total_volume': sum(p['count'] for p in data['phrases']),
                'phrases': sorted(data['phrases'], key=lambda x: x['count'], reverse=True)
            }
    
    return result

def calculate_tfidf(phrases: List[str]) -> List[Dict[str, float]]:
    '''Упрощенная TF-IDF без scikit-learn'''
    stop_words = {
        'в', 'на', 'с', 'по', 'для', 'из', 'и', 'или', 'как', 'что', 'за',
        'это', 'то', 'так', 'но', 'а', 'о', 'у', 'от', 'к', 'до', 'при',
        'без', 'под', 'над', 'между', 'перед', 'через', 'после'
    }
    
    doc_words = []
    for phrase in phrases:
        words = [w for w in phrase.lower().split() if w not in stop_words and len(w) > 2]
        doc_words.append(words)
    
    word_doc_count = defaultdict(int)
    for words in doc_words:
        unique_words = set(words)
        for word in unique_words:
            word_doc_count[word] += 1
    
    n_docs = len(phrases)
    idf = {}
    for word, count in word_doc_count.items():
        idf[word] = math.log(n_docs / count)
    
    tfidf_vectors = []
    for words in doc_words:
        word_count = defaultdict(int)
        for word in words:
            word_count[word] += 1
        
        tf = {w: count / len(words) if len(words) > 0 else 0 for w, count in word_count.items()}
        
        tfidf = {w: tf[w] * idf.get(w, 0) for w in tf}
        tfidf_vectors.append(tfidf)
    
    return tfidf_vectors

def cosine_similarity_simple(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    '''Косинусная близость между двумя векторами'''
    all_words = set(vec1.keys()) | set(vec2.keys())
    
    dot_product = sum(vec1.get(w, 0) * vec2.get(w, 0) for w in all_words)
    
    norm1 = math.sqrt(sum(v**2 for v in vec1.values()))
    norm2 = math.sqrt(sum(v**2 for v in vec2.values()))
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)

def clusterize_with_openai(phrases: List[Dict[str, Any]], mode: str = 'context') -> List[Dict[str, Any]]:
    '''
    Кластеризация через OpenAI GPT-4o-mini
    '''
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        print('[OPENAI] API key not found, falling back to TF-IDF')
        return smart_clusterize(phrases, mode)
    
    print(f'[OPENAI] API key found: {openai_key[:10]}...')
    
    phrases_text = '\n'.join([f"{p['phrase']} ({p['count']} показов)" for p in phrases[:200]])
    
    prompt = f"""Ты эксперт по кластеризации поисковых запросов для {'контекстной рекламы' if mode == 'context' else 'SEO'}.

Проанализируй фразы и раздели их на кластеры по смыслу и интенту пользователя.

Правила:
- {'Узкие кластеры (5-15 фраз) для точного таргетинга' if mode == 'context' else 'Широкие кластеры (10-30 фраз) для контента'}
- Название кластера отражает главный интент
- Каждая фраза только в одном кластере

Фразы:
{phrases_text}

Верни JSON:
{{
  "clusters": [
    {{
      "cluster_name": "Название",
      "intent": "commercial/informational/navigational",
      "phrases": [{{"phrase": "текст", "count": число}}]
    }}
  ]
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
                    {'role': 'system', 'content': 'Ты эксперт по кластеризации. Отвечаешь только валидным JSON.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'response_format': {'type': 'json_object'}
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            content = data['choices'][0]['message']['content']
            result = json.loads(content)
            clusters = result.get('clusters', [])
            print(f'[OPENAI] Created {len(clusters)} clusters via GPT-4o-mini')
            return clusters
        else:
            print(f'[OPENAI] API error {response.status_code}: {response.text}, falling back to TF-IDF')
            return smart_clusterize(phrases, mode)
            
    except Exception as e:
        print(f'[OPENAI] Error: {str(e)}, falling back to TF-IDF')
        return smart_clusterize(phrases, mode)

def smart_clusterize(phrases: List[Dict[str, Any]], mode: str = 'seo') -> List[Dict[str, Any]]:
    '''
    Супер-продвинутая кластеризация с разными режимами:
    - mode='seo': Широкие кластеры (10-30 фраз) для контента
    - mode='context': Базовые кластеры (10-50 фраз) для контекстной рекламы
    '''
    if not phrases:
        return []
    
    competitors = ['авито', 'циан', 'домклик', 'яндекс недвижимость', 'юла', 'из рук в руки']
    competitor_phrases = []
    regular_phrases = []
    
    for p in phrases:
        is_competitor = any(comp in p['phrase'].lower() for comp in competitors)
        if is_competitor:
            competitor_phrases.append(p)
        else:
            regular_phrases.append(p)
    
    if mode == 'context':
        similarity_threshold = 0.05
        target_clusters_ratio = 25
    else:
        similarity_threshold = 0.08
        target_clusters_ratio = 15
    
    phrases = regular_phrases
    
    if len(phrases) < 5:
        return [{
            'cluster_name': 'Все запросы',
            'total_count': sum(p['count'] for p in phrases),
            'phrases_count': len(phrases),
            'avg_words': round(sum(len(p['phrase'].split()) for p in phrases) / len(phrases), 1),
            'max_frequency': max(p['count'] for p in phrases),
            'min_frequency': min(p['count'] for p in phrases),
            'intent': detect_intent(phrases[0]['phrase']),
            'phrases': sorted(phrases, key=lambda x: x['count'], reverse=True)
        }]
    
    lemmatized = [lemmatize_phrase(p['phrase']) for p in phrases]
    
    tfidf_vectors = calculate_tfidf(lemmatized)
    
    n = len(phrases)
    similarity_matrix = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(i+1, n):
            sim = cosine_similarity_simple(tfidf_vectors[i], tfidf_vectors[j])
            similarity_matrix[i][j] = sim
            similarity_matrix[j][i] = sim
    
    clusters = [[i] for i in range(n)]
    
    target_clusters = max(3, min(20, n // target_clusters_ratio))
    
    while len(clusters) > target_clusters:
        max_sim = -1
        merge_pair = None
        
        for i in range(len(clusters)):
            for j in range(i+1, len(clusters)):
                avg_sim = 0
                count = 0
                for idx_i in clusters[i]:
                    for idx_j in clusters[j]:
                        avg_sim += similarity_matrix[idx_i][idx_j]
                        count += 1
                
                if count > 0:
                    avg_sim /= count
                    if avg_sim > max_sim:
                        max_sim = avg_sim
                        merge_pair = (i, j)
        
        if max_sim < similarity_threshold or merge_pair is None:
            break
        
        i, j = merge_pair
        clusters[i].extend(clusters[j])
        del clusters[j]
    
    stop_words_for_naming = {
        'купить', 'заказать', 'цена', 'стоимость', 'недорого', 
        'дешево', 'москва', 'спб', 'россия', 'доставка'
    }
    
    result = []
    for cluster_indices in clusters:
        cluster_phrases = [phrases[i] for i in cluster_indices]
        sorted_phrases = sorted(cluster_phrases, key=lambda x: x['count'], reverse=True)
        
        lemmas_counter = defaultdict(int)
        for idx in cluster_indices:
            lemma = lemmatized[idx]
            for word in lemma.split():
                if len(word) > 2 and word not in stop_words_for_naming:
                    lemmas_counter[word] += 1
        
        if lemmas_counter:
            sorted_words = sorted(lemmas_counter.items(), key=lambda x: x[1], reverse=True)
            top_words = [w for w, _ in sorted_words[:2]]
            cluster_name = ' '.join(top_words).title()
        else:
            words = sorted_phrases[0]['phrase'].split()
            cluster_name = ' '.join(words[:2]).title()
        
        intents = [detect_intent(p['phrase']) for p in cluster_phrases]
        intent_counts = defaultdict(int)
        for intent in intents:
            intent_counts[intent] += 1
        dominant_intent = max(intent_counts.items(), key=lambda x: x[1])[0]
        
        result.append({
            'cluster_name': cluster_name,
            'total_count': sum(p['count'] for p in cluster_phrases),
            'phrases_count': len(cluster_phrases),
            'avg_words': round(sum(len(p['phrase'].split()) for p in cluster_phrases) / len(cluster_phrases), 1),
            'max_frequency': max(p['count'] for p in cluster_phrases),
            'min_frequency': min(p['count'] for p in cluster_phrases),
            'intent': dominant_intent,
            'phrases': sorted_phrases
        })
    
    result.sort(key=lambda x: x['total_count'], reverse=True)
    
    if competitor_phrases:
        result.append({
            'cluster_name': 'Агрегаторы и конкуренты',
            'total_count': sum(p['count'] for p in competitor_phrases),
            'phrases_count': len(competitor_phrases),
            'avg_words': round(sum(len(p['phrase'].split()) for p in competitor_phrases) / len(competitor_phrases), 1),
            'max_frequency': max(p['count'] for p in competitor_phrases),
            'min_frequency': min(p['count'] for p in competitor_phrases),
            'intent': 'general',
            'phrases': sorted(competitor_phrases, key=lambda x: x['count'], reverse=True)
        })
    
    return result

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение данных из Яндекс.Wordstat API с СУПЕР умной кластеризацией
    Args: event - dict с httpMethod, body (keywords: List[str], regions: List[int])
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с кластеризованными данными о частотности запросов
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
    
    token = os.environ.get('YANDEX_WORDSTAT_TOKEN')
    if not token:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Токен не настроен. Добавьте YANDEX_WORDSTAT_TOKEN.'})
        }
    
    if method == 'GET':
        try:
            api_url = 'https://api.wordstat.yandex.net/v1/getRegionsTree'
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json; charset=utf-8',
                'Accept-Language': 'ru'
            }
            
            response = requests.get(api_url, headers=headers, timeout=30)
            
            if response.status_code != 200:
                return {
                    'statusCode': response.status_code,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': f'API error: {response.status_code}'})
                }
            
            data = response.json()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'regions': data})
            }
        except Exception as e:
            print(f'[REGIONS ERROR] {str(e)}')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': str(e)})
            }
    
    if method == 'POST':
        body_str = event.get('body', '{}')
        if not body_str or body_str.strip() == '':
            body_str = '{}'
        body_data = json.loads(body_str)
        keywords: List[str] = body_data.get('keywords', [])
        regions: List[int] = body_data.get('regions', [213])
        use_openai: bool = body_data.get('use_openai', True)
        
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
        
        api_url = 'https://api.wordstat.yandex.net/v1/topRequests'
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Language': 'ru'
        }
        
        try:
            payload = {
                'phrase': keywords[0],
                'regions': regions
            }
            
            print(f'[WORDSTAT] Request payload: phrase={keywords[0]}, regions={regions}')
            
            response = requests.post(api_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code != 200:
                return {
                    'statusCode': response.status_code,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': f'API error: {response.status_code}'})
                }
            
            data = response.json()
            
            if 'error' in data:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': data.get('error')})
                }
            
            top_requests = data.get('topRequests', [])
            clustering_mode = body_data.get('mode', 'seo')
            print(f'[WORDSTAT] Got {len(top_requests)} phrases from Yandex API, mode: {clustering_mode}')
            
            if use_openai:
                print('[WORDSTAT] Using OpenAI GPT-4o-mini for clustering')
                clusters = clusterize_with_openai(top_requests, mode=clustering_mode)
            else:
                print('[WORDSTAT] Using TF-IDF for clustering')
                clusters = smart_clusterize(top_requests, mode=clustering_mode)
            
            print(f'[WORDSTAT] Created {len(clusters)} smart clusters ({clustering_mode} mode)')
            
            minus_words = {}
            if clustering_mode == 'context':
                minus_words = detect_minus_words(top_requests)
                print(f'[WORDSTAT] Detected {sum(v["count"] for v in minus_words.values())} minus-words')
            
            search_query = [{
                'Keyword': keywords[0],
                'Shows': top_requests[0]['count'] if top_requests else 0,
                'TopRequests': top_requests,
                'Clusters': clusters,
                'MinusWords': minus_words,
                'Mode': clustering_mode
            }]
        
        except requests.exceptions.Timeout:
            return {
                'statusCode': 504,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Превышено время ожидания ответа от API'})
            }
        except Exception as e:
            print(f'[WORDSTAT ERROR] {str(e)}')
            import traceback
            traceback.print_exc()
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': f'Ошибка: {str(e)}'})
            }
        
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
                }
            }, ensure_ascii=False)
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }