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

def smart_clusterize(phrases: List[Dict[str, Any]], similarity_threshold: float = 0.25) -> List[Dict[str, Any]]:
    '''
    Супер-продвинутая кластеризация:
    - Лемматизация через pymorphy3
    - TF-IDF без тяжелых библиотек
    - Иерархическая кластеризация по близости
    - Определение search intent
    '''
    if not phrases:
        return []
    
    if len(phrases) < 3:
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
    
    while len(clusters) > min(15, max(3, n // 8)):
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
    
    result = []
    for cluster_indices in clusters:
        cluster_phrases = [phrases[i] for i in cluster_indices]
        sorted_phrases = sorted(cluster_phrases, key=lambda x: x['count'], reverse=True)
        
        lemmas_counter = defaultdict(int)
        for idx in cluster_indices:
            lemma = lemmatized[idx]
            for word in lemma.split():
                if len(word) > 2:
                    lemmas_counter[word] += 1
        
        if lemmas_counter:
            most_common = max(lemmas_counter.items(), key=lambda x: x[1])[0]
            cluster_name = most_common.capitalize()
        else:
            cluster_name = sorted_phrases[0]['phrase'].split()[0].capitalize()
        
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
    
    if method == 'POST':
        body_str = event.get('body', '{}')
        if not body_str or body_str.strip() == '':
            body_str = '{}'
        body_data = json.loads(body_str)
        keywords: List[str] = body_data.get('keywords', [])
        regions: List[int] = body_data.get('regions', [213])
        
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
            print(f'[WORDSTAT] Got {len(top_requests)} phrases from Yandex API')
            
            clusters = smart_clusterize(top_requests)
            print(f'[WORDSTAT] Created {len(clusters)} smart clusters with TF-IDF+Cosine')
            
            search_query = [{
                'Keyword': keywords[0],
                'Shows': top_requests[0]['count'] if top_requests else 0,
                'TopRequests': top_requests,
                'Clusters': clusters
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
