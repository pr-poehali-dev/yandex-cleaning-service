import json
import os
from typing import Dict, Any
import psycopg2
import psycopg2.extras

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: CRUD операции с проектами РСЯ чистки
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с request_id
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters', {}) or {}
    headers_raw = event.get('headers', {})
    
    # CORS OPTIONS
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
    
    # Получаем user_id из заголовка
    user_id = headers_raw.get('X-User-Id') or headers_raw.get('x-user-id')
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'X-User-Id header required'})
        }
    
    try:
        user_id_int = int(user_id)
    except:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid user_id'})
        }
    
    # Подключение к БД
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL not configured'})
        }
    
    try:
        conn = psycopg2.connect(dsn)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # GET /projects - список проектов пользователя
        if method == 'GET' and not query_params.get('project_id'):
            cursor.execute(
                "SELECT id, name, created_at, updated_at, (yandex_token IS NOT NULL) as has_token FROM rsya_projects WHERE user_id = %s ORDER BY created_at DESC",
                (user_id_int,)
            )
            rows = cursor.fetchall()
            
            projects = []
            for row in rows:
                projects.append({
                    'id': row[0],
                    'name': row[1],
                    'created_at': row[2].isoformat() if row[2] else None,
                    'updated_at': row[3].isoformat() if row[3] else None,
                    'has_token': row[4]
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'projects': projects})
            }
        
        # GET /projects?project_id=X - получить проект с токеном
        if method == 'GET' and query_params.get('project_id'):
            project_id = int(query_params['project_id'])
            
            cursor.execute(
                "SELECT id, name, yandex_token, created_at, updated_at FROM rsya_projects WHERE id = %s AND user_id = %s",
                (project_id, user_id_int)
            )
            row = cursor.fetchone()
            
            if not row:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Project not found'})
                }
            
            project = {
                'id': row[0],
                'name': row[1],
                'yandex_token': row[2],
                'created_at': row[3].isoformat() if row[3] else None,
                'updated_at': row[4].isoformat() if row[4] else None
            }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'project': project})
            }
        
        # POST /projects - создать проект
        if method == 'POST':
            body_str = event.get('body', '{}')
            body_data = json.loads(body_str)
            
            project_name = body_data.get('name', 'Новый проект')
            
            cursor.execute(
                "INSERT INTO rsya_projects (name, user_id) VALUES (%s, %s) RETURNING id, name, created_at",
                (project_name, user_id_int)
            )
            row = cursor.fetchone()
            
            project = {
                'id': row[0],
                'name': row[1],
                'created_at': row[2].isoformat() if row[2] else None,
                'has_token': False
            }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'project': project})
            }
        
        # PUT /projects - обновить токен проекта
        if method == 'PUT':
            body_str = event.get('body', '{}')
            body_data = json.loads(body_str)
            
            project_id = body_data.get('project_id')
            yandex_token = body_data.get('yandex_token')
            
            if not project_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'project_id required'})
                }
            
            cursor.execute(
                "UPDATE rsya_projects SET yandex_token = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s RETURNING id",
                (yandex_token, project_id, user_id_int)
            )
            row = cursor.fetchone()
            
            if not row:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Project not found'})
                }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        # DELETE /projects?project_id=X - удалить проект
        if method == 'DELETE':
            project_id = int(query_params.get('project_id', 0))
            
            if not project_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'project_id required'})
                }
            
            cursor.execute(
                "DELETE FROM rsya_projects WHERE id = %s AND user_id = %s RETURNING id",
                (project_id, user_id_int)
            )
            row = cursor.fetchone()
            
            if not row:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Project not found'})
                }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    except Exception as e:
        print(f'[ERROR] Database error: {str(e)}')
        import traceback
        print(f'[ERROR] Traceback: {traceback.format_exc()}')
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }