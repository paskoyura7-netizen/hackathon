from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app) # Це дозволяє фронтенду підключатися до бекенду без помилок безпеки

DB_NAME = 'student_calendar.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row # Перетворює результати на зручні словники
    return conn

@app.route('/api/schedule', methods=['GET'])
def api_get_schedule():
    # Отримуємо назву групи та підгрупу з URL (напр. ?group=ІП-25-1&subgroup=1)
    group = request.args.get('group', 'ІП-25-1')
    subgroup = int(request.args.get('subgroup', 0))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Запит: витягнути лекції (subgroup=0) ТА пари конкретної підгрупи розробника
    cursor.execute('''
        SELECT day_of_week, time_start, time_end, subject_name 
        FROM schedule 
        WHERE group_name = ? AND (subgroup = 0 OR subgroup = ?)
        ORDER BY day_of_week, time_start
    ''', (group, subgroup))
    
    lessons = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(lessons)

if __name__ == '__main__':
    # Сервер буде жити тут: http://127.0.0.1:5000
    app.run(debug=True, port=5000)