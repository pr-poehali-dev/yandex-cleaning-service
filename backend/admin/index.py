'''
Business: Админ-панель для управления пользователями и подписками
Args: event - dict с httpMethod, body, headers (X-User-Id для проверки прав админа)
      context - object с request_id
Returns: HTTP response со списком пользователей или результатом операции
'''

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Проверяем права администратора
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        admin_check = cur.fetchone()
        
        if not admin_check or not admin_check.get('is_admin'):
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Access denied: admin only'})
            }
        
        # GET - список всех пользователей с подписками
        if method == 'GET':
            cur.execute("""
                SELECT 
                    u.id,
                    u.phone,
                    u.is_verified,
                    u.created_at,
                    u.last_login_at,
                    u.is_admin,
                    s.plan_type,
                    s.status,
                    s.trial_ends_at,
                    s.subscription_ends_at,
                    s.is_infinite,
                    s.allowed_services
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id
                ORDER BY u.created_at DESC
            """)
            
            users = cur.fetchall()
            
            # Формируем удобный формат
            result = []
            for user in users:
                now = datetime.now()
                has_access = False
                expires_at = None
                
                if user['is_infinite']:
                    has_access = True
                    expires_at = None
                elif user['plan_type'] == 'trial' and user['trial_ends_at']:
                    if now < user['trial_ends_at']:
                        has_access = True
                        expires_at = user['trial_ends_at'].isoformat()
                elif user['plan_type'] == 'monthly' and user['subscription_ends_at']:
                    if now < user['subscription_ends_at']:
                        has_access = True
                        expires_at = user['subscription_ends_at'].isoformat()
                
                result.append({
                    'id': user['id'],
                    'phone': user['phone'],
                    'isVerified': user['is_verified'],
                    'isAdmin': user['is_admin'],
                    'createdAt': user['created_at'].isoformat() if user['created_at'] else None,
                    'lastLoginAt': user['last_login_at'].isoformat() if user['last_login_at'] else None,
                    'subscription': {
                        'planType': user['plan_type'],
                        'status': user['status'],
                        'hasAccess': has_access,
                        'expiresAt': expires_at,
                        'isInfinite': user['is_infinite'],
                        'allowedServices': user['allowed_services'] or []
                    }
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'users': result})
            }
        
        # POST - управление подписками
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            target_user_id = body_data.get('userId')
            action = body_data.get('action')
            
            if not target_user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'userId required'})
                }
            
            # Активация бесконечной подписки
            if action == 'setInfinite':
                is_infinite = body_data.get('isInfinite', True)
                services = body_data.get('services', [])
                
                # Проверяем существование подписки
                cur.execute("SELECT * FROM subscriptions WHERE user_id = %s", (target_user_id,))
                existing = cur.fetchone()
                
                if existing:
                    cur.execute(
                        """UPDATE subscriptions 
                           SET is_infinite = %s, allowed_services = %s, status = %s
                           WHERE user_id = %s""",
                        (is_infinite, services, 'active' if is_infinite else existing['status'], target_user_id)
                    )
                else:
                    cur.execute(
                        """INSERT INTO subscriptions 
                           (user_id, plan_type, status, is_infinite, allowed_services)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (target_user_id, 'infinite', 'active', is_infinite, services)
                    )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Infinite subscription updated'})
                }
            
            # Продление обычной подписки
            elif action == 'extendSubscription':
                days = body_data.get('days', 30)
                
                cur.execute("SELECT * FROM subscriptions WHERE user_id = %s", (target_user_id,))
                existing = cur.fetchone()
                
                now = datetime.now()
                new_end_date = now + timedelta(days=days)
                
                if existing:
                    # Если подписка уже есть и активна, продлеваем от текущей даты окончания
                    if existing['subscription_ends_at'] and existing['subscription_ends_at'] > now:
                        new_end_date = existing['subscription_ends_at'] + timedelta(days=days)
                    
                    cur.execute(
                        """UPDATE subscriptions 
                           SET plan_type = %s, status = %s, 
                               subscription_started_at = %s, subscription_ends_at = %s
                           WHERE user_id = %s""",
                        ('monthly', 'active', now, new_end_date, target_user_id)
                    )
                else:
                    cur.execute(
                        """INSERT INTO subscriptions 
                           (user_id, plan_type, status, subscription_started_at, subscription_ends_at)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (target_user_id, 'monthly', 'active', now, new_end_date)
                    )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': f'Subscription extended by {days} days'})
                }
            
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid action'})
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        cur.close()
        conn.close()
