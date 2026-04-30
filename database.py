import sqlite3
from datetime import datetime

DB_NAME = 'student_calendar.db'

def create_tables():
    """Створює повну структуру бази даних."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Таблиця предметів (Subjects)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT
        )
    ''')

    # 2. Таблиця користувачів (Students)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            course_year INTEGER DEFAULT 1,
            specialty TEXT
        )
    ''')

    # 3. Таблиця подій (Events - основа календаря)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            subject_id TEXT,
            event_type TEXT NOT NULL, -- 'lecture', 'deadline', 'exam', 'personal'
            title TEXT NOT NULL,
            event_date DATETIME NOT NULL,
            is_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database structure successfully created!")

def seed_initial_data():
    """Наповнює базу тестовими даними."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Додаємо предмети
    subjects = [
        ('math-01', 'Higher Mathematics', 'Calculus and Analytical Geometry'),
        ('cpp-01', 'C++ Programming', 'Basics, classes, exception handling'),
        ('arch-01', 'Software Architecture', 'Design patterns and system design')
    ]
    cursor.executemany('INSERT OR IGNORE INTO subjects VALUES (?, ?, ?)', subjects)

    # Додаємо тестового студента
    cursor.execute('''
        INSERT OR IGNORE INTO students (id, name, course_year, specialty) 
        VALUES (1, 'Test Student', 1, 'Software Engineering')
    ''')

    # Додаємо події в календар
    events = [
        (1, 'cpp-01', 'deadline', 'Submit Exception Handling Lab', '2026-05-05 23:59:00', 0),
        (1, 'math-01', 'lecture', 'Lecture on Bezier Curves', '2026-05-02 10:00:00', 0)
    ]
    cursor.executemany('''
        INSERT INTO events (student_id, subject_id, event_type, title, event_date, is_completed)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', events)

    conn.commit()
    conn.close()
    print("Test data successfully loaded!")

# --- API Функції для твого колеги (Фронтендера) ---

def get_all_subjects():
    """Повертає список всіх предметів."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM subjects")
    data = cursor.fetchall()
    conn.close()
    return data

def get_student_calendar(student_id):
    """Повертає розклад конкретного студента, об'єднуючи події з назвами предметів."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.title, e.event_date, e.event_type, s.name, e.is_completed
        FROM events e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.student_id = ?
        ORDER BY e.event_date ASC
    ''', (student_id,))
    data = cursor.fetchall()
    conn.close()
    return data

def add_event(student_id, subject_id, event_type, title, event_date):
    """Додає нову подію до календаря (наприклад, через запит з сайту або бота)."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO events (student_id, subject_id, event_type, title, event_date, is_completed)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (student_id, subject_id, event_type, title, event_date))
    conn.commit()
    conn.close()
    print(f"Event '{title}' added successfully!")
if name == 'main':
    # Цей блок виконується лише при прямому запуску файлу
    create_tables()
    seed_initial_data() 
    
    # Тестуємо, чи працюють функції
    print("\n--- Test: All subjects ---")
    for subject in get_all_subjects():
        print(subject)
    
    print("\n--- Test: Student Calendar ---")
    for event in get_student_calendar(1):
        print(event)
