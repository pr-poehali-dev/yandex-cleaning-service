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

def clusterize_with_openai(phrases: List[Dict[str, Any]], mode: str = 'context', region_names: List[str] = None, selected_intents: List[str] = None) -> tuple:
    '''
    Кластеризация через OpenAI GPT-4o с учётом регионов и интентов
    Args:
        phrases: список фраз с частотностью
        mode: 'context' (Яндекс.Директ) или 'seo' (SEO)
        region_names: список регионов (например ['Москва', 'Санкт-Петербург'])
        selected_intents: выбранные интенты (например ['commercial', 'transactional'])
    Returns: (clusters, minus_words)
    '''
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        print('[OPENAI] API key not found - using TF-IDF clustering')
        clusters = smart_clusterize(phrases, mode)
        minus_words = detect_minus_words(phrases) if mode == 'context' else {}
        return clusters, minus_words
    
    phrases_text = '\n'.join([f"{p['phrase']} ({p['count']} показов)" for p in phrases[:150]])
    
    regions_text = ', '.join(region_names) if region_names else 'Россия'
    
    intent_descriptions = {
        'commercial': 'Коммерческие (купить, цена, заказать)',
        'transactional': 'Транзакционные (оформить, записаться, получить)',
        'informational': 'Информационные (как, что такое, инструкция)',
        'navigational': 'Навигационные (сайт, официальный, контакты)'
    }
    
    selected_intents_text = ', '.join([intent_descriptions.get(i, i) for i in selected_intents]) if selected_intents else 'Все типы'
    
    if mode == 'context':
        prompt = f"""Ты эксперт по контекстной рекламе Яндекс.Директ. Твоя задача — кластеризовать поисковые запросы для создания максимально эффективных рекламных групп.

📊 КОНТЕКСТ ЗАДАЧИ:
• Регионы показа: {regions_text}
• Целевые интенты: {selected_intents_text}
• Цель: Контекстная реклама (узкие таргетированные группы)

🎯 СТРАТЕГИЯ КЛАСТЕРИЗАЦИИ:
1. **Узкие кластеры (3-15 фраз)** — каждая группа должна быть максимально однородной
2. **Разделяй по признакам**: 
   - Тип товара/услуги (например: "пластиковые окна" ≠ "деревянные окна")
   - Характеристики (размер, цвет, материал, бренд)
   - Действия (купить ≠ установить ≠ отремонтировать)
   - Цена (недорого, премиум, со скидкой)
   - Срочность (срочно, быстро, круглосуточно)
3. **Учитывай ТОЛЬКО выбранные интенты** — игнорируй запросы других типов
4. **Название кластера** — 2-4 слова из самых частотных фраз группы

🚫 МИНУС-СЛОВА (отфильтруй нецелевые запросы):
• **free** — бесплатно, даром, free, безвозмездно
• **info** — как сделать, своими руками, инструкция, отзывы, форум, что такое
• **competitors** — авито, циан, озон, вайлдберриз, яндекс маркет
• **irrelevant** — вакансии, работа, курсы, обучение, скачать, игры, картинки

📋 СПИСОК ФРАЗ ({len(phrases[:150])} запросов):
{phrases_text}

⚡ ОТВЕТ В JSON:
{{
  "clusters": [
    {{
      "cluster_name": "Краткое название 2-4 слова",
      "intent": "commercial/transactional/informational/navigational",
      "phrases": [
        {{"phrase": "точная фраза из списка", "count": 1234}}
      ]
    }}
  ],
  "minus_words": {{
    "free": [{{"phrase": "...", "count": N}}],
    "info": [{{"phrase": "...", "count": N}}],
    "competitors": [{{"phrase": "...", "count": N}}],
    "irrelevant": [{{"phrase": "...", "count": N}}]
  }}
}}"""
    else:
        prompt = f"""Ты SEO-эксперт. Твоя задача — кластеризовать запросы для создания посадочных страниц и контентной стратегии сайта.

📊 КОНТЕКСТ ЗАДАЧИ:
• Регионы: {regions_text}
• Целевые интенты: {selected_intents_text}
• Цель: SEO (широкая семантика для страниц)

🎯 СТРАТЕГИЯ КЛАСТЕРИЗАЦИИ:
1. **Средние/широкие кластеры (10-40 фраз)** — группируй по общему смыслу и intent
2. **Критерии группировки**:
   - Общая тема или категория товаров/услуг
   - Похожий поисковый интент
   - Релевантность одной посадочной странице
   - Синонимы и близкие формулировки
3. **Учитывай регион** — {regions_text} может влиять на локальную специфику запросов
4. **Учитывай ТОЛЬКО выбранные интенты** — {selected_intents_text}
5. **Название кластера** — 2-5 слов, отражает суть всей группы

💡 ПРИМЕРЫ ПРАВИЛЬНОЙ ГРУППИРОВКИ:
• "Купить окна Москва" + "Окна цена Москва" + "Пластиковые окна Москва" → Кластер "Окна Москва"
• "Ремонт квартир под ключ" + "Ремонт квартир недорого" + "Косметический ремонт" → Кластер "Ремонт квартир"

📋 СПИСОК ФРАЗ ({len(phrases[:150])} запросов):
{phrases_text}

⚡ ОТВЕТ В JSON:
{{
  "clusters": [
    {{
      "cluster_name": "Понятное название 2-5 слов",
      "intent": "commercial/transactional/informational/navigational",
      "phrases": [
        {{"phrase": "точная фраза из списка", "count": 1234}}
      ]
    }}
  ]
}}"""
    
    proxy_url = os.environ.get('OPENAI_PROXY_URL')
    proxies = {}
    if proxy_url:
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        print(f'[OPENAI] Using proxy: {proxy_url[:20]}...')
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {openai_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4o',
                'messages': [
                    {'role': 'system', 'content': 'Ты эксперт по кластеризации запросов. Анализируешь смысл и намерения пользователя. Отвечаешь только валидным JSON.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'response_format': {'type': 'json_object'}
            },
            proxies=proxies if proxies else None,
            timeout=90
        )
        
        if response.status_code == 200:
            data = response.json()
            content = data['choices'][0]['message']['content']
            result = json.loads(content)
            clusters = result.get('clusters', [])
            minus_words = result.get('minus_words', {})
            print(f'[OPENAI] Created {len(clusters)} clusters via GPT-4o-mini')
            if minus_words:
                total_minus = sum(len(v) for v in minus_words.values() if isinstance(v, list))
                print(f'[OPENAI] Detected {total_minus} minus-words')
            return clusters, minus_words
        else:
            print(f'[OPENAI] API error {response.status_code}: {response.text}, falling back to TF-IDF')
            clusters = smart_clusterize(phrases, mode)
            minus_words = detect_minus_words(phrases) if mode == 'context' else {}
            return clusters, minus_words
            
    except Exception as e:
        print(f'[OPENAI] Error: {str(e)}, falling back to TF-IDF')
        clusters = smart_clusterize(phrases, mode)
        minus_words = detect_minus_words(phrases) if mode == 'context' else {}
        return clusters, minus_words

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

def generate_geo_keywords(address: str, base_query: str) -> List[str]:
    '''
    Генерация геозависимых вариаций адреса через OpenAI
    address: "Ставрополь, Кулакова 1"
    base_query: "купить квартиру"
    Returns: ["купить квартиру Кулакова", "купить квартиру Кулакова 1", ...]
    '''
    openai_key = os.environ.get('OPENAI_API_KEY')
    proxy_url = os.environ.get('OPENAI_PROXY_URL')
    
    if not openai_key:
        print('[GEO] OpenAI key not found')
        return []
    
    prompt = f"""Ты эксперт по недвижимости и геолокации. Сгенерируй ВСЕ возможные варианты поисковых фраз для этого адреса:

Адрес: {address}
Базовый запрос: {base_query}

Сгенерируй 15-25 вариантов, которые люди могут использовать при поиске:
1. Полный адрес: "город улица дом"
2. Улица с домом: "улица дом"  
3. Только улица: "улица"
4. Район города
5. Ориентиры рядом: "рядом с [место]"
6. Транспортные узлы: "у метро [название]"  
7. Микрорайоны
8. Разговорные варианты

Формат ответа: ТОЛЬКО список фраз через запятую, каждая фраза должна начинаться с базового запроса.
Пример: купить квартиру Кулакова, купить квартиру Кулакова 1, купить квартиру Северо-Западный район, купить квартиру рядом с Тухачевским рынком

Ответ:"""

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {openai_key}'
    }
    
    payload = {
        'model': 'gpt-4o-mini',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.7,
        'max_tokens': 400
    }
    
    proxies = None
    if proxy_url:
        proxies = {'http': proxy_url, 'https': proxy_url}
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            proxies=proxies,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f'[GEO] OpenAI error: {response.status_code}')
            return []
        
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        # Parse comma-separated list
        variations = [v.strip() for v in content.split(',') if v.strip()]
        
        print(f'[GEO] Generated {len(variations)} geo variations')
        return variations[:25]  # Limit to 25
        
    except Exception as e:
        print(f'[GEO] Error: {e}')
        return []

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
        object_address: str = body_data.get('objectAddress', '')
        region_names: List[str] = body_data.get('region_names', [])
        selected_intents: List[str] = body_data.get('selected_intents', [])
        
        print(f'[WORDSTAT] Request params: keywords={keywords}, regions={regions}, use_openai={use_openai}')
        print(f'[WORDSTAT] Body data: {body_data}')
        
        if not keywords or len(keywords) == 0 or not keywords[0].strip():
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
                print(f'[WORDSTAT] Using OpenAI GPT-4o for clustering (regions: {region_names}, intents: {selected_intents})')
                clusters, minus_words = clusterize_with_openai(
                    top_requests, 
                    mode=clustering_mode,
                    region_names=region_names,
                    selected_intents=selected_intents
                )
            else:
                print('[WORDSTAT] Using TF-IDF for clustering')
                clusters = smart_clusterize(top_requests, mode=clustering_mode)
                minus_words = {}
                if clustering_mode == 'context':
                    minus_words = detect_minus_words(top_requests)
            
            print(f'[WORDSTAT] Created {len(clusters)} smart clusters ({clustering_mode} mode)')
            if minus_words:
                total_minus = sum(v.get('count', 0) if isinstance(v, dict) else len(v) if isinstance(v, list) else 0 for v in minus_words.values())
                print(f'[WORDSTAT] Detected {total_minus} minus-words')
            
            # Добавляем геоключи, если указан адрес объекта
            geo_cluster = None
            if object_address and object_address.strip():
                print(f'[GEO] Generating geo keywords for: {object_address}')
                geo_keywords = generate_geo_keywords(object_address, keywords[0])
                
                if geo_keywords:
                    # Проверяем частотность в Wordstat
                    geo_phrases = []
                    for geo_kw in geo_keywords[:15]:  # Limit to 15 requests
                        try:
                            payload_geo = {'phrase': geo_kw, 'regions': regions}
                            resp_geo = requests.post(api_url, json=payload_geo, headers=headers, timeout=10)
                            if resp_geo.status_code == 200:
                                data_geo = resp_geo.json()
                                top_req_geo = data_geo.get('topRequests', [])
                                if top_req_geo and top_req_geo[0]['count'] > 10:  # Min frequency 10
                                    geo_phrases.append(top_req_geo[0])
                        except:
                            pass
                    
                    if geo_phrases:
                        geo_cluster = {
                            'cluster_name': '📍 Геолокация',
                            'total_count': sum(p['count'] for p in geo_phrases),
                            'phrases_count': len(geo_phrases),
                            'avg_words': round(sum(len(p['phrase'].split()) for p in geo_phrases) / len(geo_phrases), 1),
                            'max_frequency': max(p['count'] for p in geo_phrases),
                            'min_frequency': min(p['count'] for p in geo_phrases),
                            'intent': 'commercial',
                            'phrases': sorted(geo_phrases, key=lambda x: x['count'], reverse=True)
                        }
                        clusters.insert(0, geo_cluster)  # Add as first cluster
                        print(f'[GEO] Added geo cluster with {len(geo_phrases)} phrases')
            
            search_query = [{
                'Keyword': keywords[0],
                'Shows': top_requests[0]['count'] if top_requests else 0,
                'TopRequests': top_requests,
                'Clusters': clusters,
                'MinusWords': minus_words,
                'Mode': clustering_mode,
                'GeoCluster': geo_cluster
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