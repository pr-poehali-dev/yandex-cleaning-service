'''
Business: Управление подписками пользователей - проверка доступа, активация триала и платной подписки
Args: event - dict с httpMethod, body, headers (X-User-Id)
      context - object с request_id
Returns: HTTP response с информацией о подписке
'''

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            'body': json.dumps({'error': 'User ID required'})
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # GET - проверка статуса подписки
        if method == 'GET':
            cur.execute(
                "SELECT * FROM subscriptions WHERE user_id = %s",
                (user_id,)
            )
            subscription = cur.fetchone()
            
            if not subscription:
                # Создаем триал для нового пользователя
                trial_started = datetime.now()
                trial_ends = trial_started + timedelta(days=1)
                
                cur.execute(
                    """INSERT INTO subscriptions 
                       (user_id, plan_type, status, trial_started_at, trial_ends_at)
                       VALUES (%s, %s, %s, %s, %s)
                       RETURNING *""",
                    (user_id, 'trial', 'active', trial_started, trial_ends)
                )
                subscription = cur.fetchone()
                conn.commit()
            
            # Проверяем актуальность подписки
            now = datetime.now()
            has_access = False
            expires_at = None
            
            if subscription['plan_type'] == 'trial':
                if subscription['trial_ends_at'] and now < subscription['trial_ends_at']:
                    has_access = True
                    expires_at = subscription['trial_ends_at'].isoformat()
                elif subscription['status'] == 'active':
                    # Триал истек
                    cur.execute(
                        "UPDATE subscriptions SET status = %s WHERE user_id = %s",
                        ('expired', user_id)
                    )
                    conn.commit()
            
            elif subscription['plan_type'] == 'monthly':
                if subscription['subscription_ends_at'] and now < subscription['subscription_ends_at']:
                    has_access = True
                    expires_at = subscription['subscription_ends_at'].isoformat()
                elif subscription['status'] == 'active':
                    # Подписка истекла
                    cur.execute(
                        "UPDATE subscriptions SET status = %s WHERE user_id = %s",
                        ('expired', user_id)
                    )
                    conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'hasAccess': has_access,
                    'planType': subscription['plan_type'],
                    'status': subscription['status'],
                    'expiresAt': expires_at,
                    'trialEndsAt': subscription['trial_ends_at'].isoformat() if subscription['trial_ends_at'] else None
                })
            }
        
        # POST - активация платной подписки
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'activate':
                # Проверяем существование подписки
                cur.execute(
                    "SELECT * FROM subscriptions WHERE user_id = %s",
                    (user_id,)
                )
                existing = cur.fetchone()
                
                subscription_started = datetime.now()
                subscription_ends = subscription_started + timedelta(days=30)
                
                if existing:
                    # Обновляем существующую
                    cur.execute(
                        """UPDATE subscriptions 
                           SET plan_type = %s, status = %s, 
                               subscription_started_at = %s, subscription_ends_at = %s
                           WHERE user_id = %s
                           RETURNING *""",
                        ('monthly', 'active', subscription_started, subscription_ends, user_id)
                    )
                else:
                    # Создаем новую
                    cur.execute(
                        """INSERT INTO subscriptions 
                           (user_id, plan_type, status, subscription_started_at, subscription_ends_at)
                           VALUES (%s, %s, %s, %s, %s)
                           RETURNING *""",
                        (user_id, 'monthly', 'active', subscription_started, subscription_ends)
                    )
                
                subscription = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'subscription': {
                            'planType': subscription['plan_type'],
                            'status': subscription['status'],
                            'expiresAt': subscription['subscription_ends_at'].isoformat()
                        }
                    })
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