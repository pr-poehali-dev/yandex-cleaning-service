import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Handle user authentication (login/registration)
    Args: event with httpMethod, body (phone number)
    Returns: User object with integer ID from database
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
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
    
    body_data = json.loads(event.get('body', '{}'))
    phone = body_data.get('phone')
    
    if not phone:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Phone is required'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute(
        f"SELECT id, phone, created_at FROM t_p97630513_yandex_cleaning_serv.users WHERE phone = '{phone}'"
    )
    user_row = cur.fetchone()
    
    if user_row:
        user_id, user_phone, created_at = user_row
        cur.execute(
            f"UPDATE t_p97630513_yandex_cleaning_serv.users SET last_login_at = CURRENT_TIMESTAMP WHERE id = {user_id}"
        )
        conn.commit()
    else:
        cur.execute(
            f"INSERT INTO t_p97630513_yandex_cleaning_serv.users (phone, is_verified) VALUES ('{phone}', true) RETURNING id, phone, created_at"
        )
        user_row = cur.fetchone()
        user_id, user_phone, created_at = user_row
        conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'id': user_id,
            'phone': user_phone,
            'createdAt': created_at.isoformat() if created_at else None
        })
    }
