import json
import os
import random
import psycopg2
from datetime import datetime, timedelta
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Единый API для авторизации и управления проектами кластеризации
    Args: event - dict с httpMethod, body, queryStringParameters
          context - object с request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    query_params = event.get('queryStringParameters') or {}
    endpoint = query_params.get('endpoint', '')
    
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    try:
        if endpoint == 'auth':
            return handle_auth(event, cur, conn)
        elif endpoint == 'projects':
            return handle_projects(event, cur, conn)
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid endpoint'})
            }
    finally:
        cur.close()
        conn.close()

def handle_auth(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    
    if action == 'send_code':
        phone = body_data.get('phone', '').strip()
        if not phone:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Phone is required'})
            }
        
        code = str(random.randint(100000, 999999))
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
        user = cur.fetchone()
        
        if user:
            cur.execute(
                "UPDATE users SET verification_code = %s, code_expires_at = %s WHERE phone = %s",
                (code, expires_at, phone)
            )
        else:
            cur.execute(
                "INSERT INTO users (phone, verification_code, code_expires_at) VALUES (%s, %s, %s)",
                (phone, code, expires_at)
            )
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Код отправлен', 'code': code})
        }
    
    elif action == 'verify_code':
        phone = body_data.get('phone', '').strip()
        code = body_data.get('code', '').strip()
        
        if not phone or not code:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Phone and code are required'})
            }
        
        cur.execute(
            "SELECT id, verification_code, code_expires_at FROM users WHERE phone = %s",
            (phone,)
        )
        user = cur.fetchone()
        
        if not user:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'})
            }
        
        user_id, stored_code, expires_at = user
        
        if stored_code != code:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid code'})
            }
        
        if datetime.now() > expires_at:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Code expired'})
            }
        
        cur.execute(
            "UPDATE users SET is_verified = TRUE, last_login_at = %s WHERE id = %s",
            (datetime.now(), user_id)
        )
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'userId': user_id, 'phone': phone})
        }
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'})
    }

def handle_projects(event: Dict[str, Any], cur, conn) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'})
        }
    
    if method == 'GET':
        query_params = event.get('queryStringParameters') or {}
        project_id = query_params.get('id')
        
        if project_id:
            cur.execute(
                """
                SELECT id, name, keywords_count, clusters_count, minus_words_count,
                       created_at, updated_at, results
                FROM clustering_projects
                WHERE id = %s AND user_id = %s
                """,
                (project_id, user_id)
            )
            result = cur.fetchone()
            
            if not result:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Project not found'})
                }
            
            results_data = result[10]
            
            project = {
                'id': result[0],
                'name': result[1],
                'keywordsCount': result[2],
                'clustersCount': result[3],
                'minusWordsCount': result[4],
                'createdAt': result[5].isoformat() if result[5] else None,
                'updatedAt': result[6].isoformat() if result[6] else None,
                'results': result[7]
            }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(project)
            }
        else:
            cur.execute(
                """
                SELECT id, name, source, website_url,
                       keywords_count, clusters_count, minus_words_count,
                       created_at, updated_at
                FROM clustering_projects
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (user_id,)
            )
            projects = []
            for row in cur.fetchall():
                projects.append({
                    'id': row[0],
                    'name': row[1],
                    'domain': row[3],
                    'keywordsCount': row[4],
                    'clustersCount': row[5],
                    'minusWordsCount': row[6],
                    'createdAt': row[7].isoformat() if row[7] else None,
                    'updatedAt': row[8].isoformat() if row[8] else None,
                    'status': row[2]
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'projects': projects})
            }
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        name = body_data.get('name', '')
        domain = body_data.get('domain', '')
        intent_filter = body_data.get('intentFilter', 'all')
        
        if not name:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Project name is required'})
            }
        
        cur.execute(
            """
            INSERT INTO clustering_projects (user_id, name)
            VALUES (%s, %s)
            RETURNING id, created_at, updated_at
            """,
            (user_id, name)
        )
        result = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'id': result[0],
                'name': name,
                'keywordsCount': 0,
                'clustersCount': 0,
                'minusWordsCount': 0,
                'createdAt': result[1].isoformat(),
                'updatedAt': result[2].isoformat()
            })
        }
    
    elif method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        project_id = body_data.get('id')
        
        if not project_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Project ID is required'})
            }
        
        cur.execute("SELECT id FROM clustering_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
        if not cur.fetchone():
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Project not found'})
            }
        
        update_fields = []
        update_values = []
        
        if 'name' in body_data:
            update_fields.append('name = %s')
            update_values.append(body_data['name'])
        if 'keywordsCount' in body_data:
            update_fields.append('keywords_count = %s')
            update_values.append(body_data['keywordsCount'])
        if 'clustersCount' in body_data:
            update_fields.append('clusters_count = %s')
            update_values.append(body_data['clustersCount'])
        if 'minusWordsCount' in body_data:
            update_fields.append('minus_words_count = %s')
            update_values.append(body_data['minusWordsCount'])
        if 'results' in body_data:
            update_fields.append('results = %s')
            update_values.append(json.dumps(body_data['results']))
        
        update_fields.append('updated_at = %s')
        update_values.append(datetime.now())
        update_values.append(project_id)
        update_values.append(user_id)
        
        cur.execute(
            f"UPDATE clustering_projects SET {', '.join(update_fields)} WHERE id = %s AND user_id = %s",
            update_values
        )
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True})
        }
    
    elif method == 'DELETE':
        query_params = event.get('queryStringParameters') or {}
        project_id = query_params.get('id')
        
        if not project_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Project ID is required'})
            }
        
        cur.execute("DELETE FROM clustering_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
        
        if cur.rowcount == 0:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Project not found'})
            }
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True})
        }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }