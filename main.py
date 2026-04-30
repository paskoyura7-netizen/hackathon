import sqlite3
from flask import Flask, render_template

app = Flask(__name__)
DB_NAME = 'database.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Створюємо таблицю предметів
    # subject_id буде у форматі 'math-01', 'physics-02' тощо
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            subject_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT
        )
    ''')
    
    # Додамо тестові дані (якщо їх ще немає)
    subjects = [
        ('math-01', 'Математика', 'Вища математика та аналіз'),
        ('phys-02', 'Фізика', 'Квантова механіка'),
        ('prog-03', 'Програмування', 'Основи Python та SQL')
    ]
    
    cursor.executemany('INSERT OR IGNORE INTO subjects VALUES (?, ?, ?)', subjects)
    
    conn.commit()
    conn.close()

# Головна сторінка сайту
@app.route('/')
def index():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM subjects")
    rows = cursor.fetchall()
    conn.close()
    
    # Створюємо простий HTML прямо в коді для тесту
    html = "<h1>Список предметів з бази даних</h1><table border='1'>"
    html += "<tr><th>ID (Предмет)</th><th>Назва</th><th>Опис</th></tr>"
    for row in rows:
        html += f"<tr><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>"
    html += "</table>"
    
    return html

if __name__ == '__main__':
    init_db()
    print("Сайт запущено! Перейдіть за посиланням: http://127.0.0.1:5000")
    app.run(debug=True)
