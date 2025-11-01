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
                "SELECT id, name, yandex_token, created_at, updated_at, is_configured, client_login FROM rsya_projects WHERE id = %s AND user_id = %s",
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
                'updated_at': row[4].isoformat() if row[4] else None,
                'is_configured': row[5] or False,
                'client_login': row[6]
            }
            
            print(f'[DEBUG] GET project {project_id}: is_configured={row[5]}, has_token={row[2] is not None}')
            
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
            conn.commit()
            
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
            
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        # POST /setup - сохранить кампании и цели проекта
        if method == 'POST' and query_params.get('action') == 'setup':
            body_str = event.get('body', '{}')
            body_data = json.loads(body_str)
            
            project_id = body_data.get('project_id')
            campaigns = body_data.get('campaigns', [])
            goals = body_data.get('goals', [])
            
            if not project_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'project_id required'})
                }
            
            # Проверяем что проект принадлежит пользователю
            cursor.execute(
                "SELECT id FROM rsya_projects WHERE id = %s AND user_id = %s",
                (project_id, user_id_int)
            )
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Project not found'})
                }
            
            # Удаляем старые кампании и цели
            cursor.execute("DELETE FROM rsya_campaigns WHERE project_id = %s", (project_id,))
            cursor.execute("DELETE FROM rsya_goals WHERE project_id = %s", (project_id,))
            
            # Сохраняем новые кампании
            for campaign in campaigns:
                cursor.execute(
                    """INSERT INTO rsya_campaigns (project_id, campaign_id, campaign_name, campaign_status, is_enabled)
                       VALUES (%s, %s, %s, %s, %s)
                       ON CONFLICT (project_id, campaign_id) DO UPDATE
                       SET campaign_name = EXCLUDED.campaign_name, campaign_status = EXCLUDED.campaign_status, updated_at = CURRENT_TIMESTAMP""",
                    (project_id, campaign['id'], campaign['name'], campaign.get('status', 'UNKNOWN'), True)
                )
            
            # Сохраняем новые цели
            for goal in goals:
                cursor.execute(
                    """INSERT INTO rsya_goals (project_id, goal_id, goal_name, is_enabled)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (project_id, goal_id) DO UPDATE
                       SET goal_name = EXCLUDED.goal_name, updated_at = CURRENT_TIMESTAMP""",
                    (project_id, goal['id'], goal['name'], True)
                )
            
            # Помечаем проект как настроенный
            cursor.execute(
                "UPDATE rsya_projects SET is_configured = true, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (project_id,)
            )
            
            conn.commit()
            
            print(f'[DEBUG] Setup completed for project {project_id}: campaigns={len(campaigns)}, goals={len(goals)}, is_configured=true')
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'campaigns_saved': len(campaigns),
                    'goals_saved': len(goals)
                })
            }
        
        # GET /campaigns - получить сохраненные кампании и цели проекта
        if method == 'GET' and query_params.get('action') == 'campaigns':
            project_id = int(query_params.get('project_id', 0))
            
            if not project_id:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'project_id required'})
                }
            
            # Проверяем что проект принадлежит пользователю
            cursor.execute(
                "SELECT id FROM rsya_projects WHERE id = %s AND user_id = %s",
                (project_id, user_id_int)
            )
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Project not found'})
                }
            
            # Получаем кампании
            cursor.execute(
                "SELECT campaign_id, campaign_name, campaign_status, is_enabled FROM rsya_campaigns WHERE project_id = %s ORDER BY campaign_name",
                (project_id,)
            )
            campaigns = []
            for row in cursor.fetchall():
                campaigns.append({
                    'id': row[0],
                    'name': row[1],
                    'status': row[2],
                    'enabled': row[3]
                })
            
            # Получаем цели
            cursor.execute(
                "SELECT goal_id, goal_name, is_enabled FROM rsya_goals WHERE project_id = %s ORDER BY goal_name",
                (project_id,)
            )
            goals = []
            for row in cursor.fetchall():
                goals.append({
                    'id': row[0],
                    'name': row[1],
                    'enabled': row[2]
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'campaigns': campaigns,
                    'goals': goals
                })
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