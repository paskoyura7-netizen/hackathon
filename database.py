import sqlite3
from datetime import datetime

DB_NAME = 'student_calendar.db'

def create_tables():
    """Створює структуру бази даних під вимоги сайту."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Таблиця розкладу (Для динамічного парсингу з ІФНТУНГ)
    # Поле subgroup: 0 - загальна пара (лекція), 1 або 2 - підгрупи (лабораторні)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_name TEXT NOT NULL,      -- 'ІПЗ-25-1', 'ІПЗ-25-2', 'ІПЗ-25-3'
            subgroup INTEGER DEFAULT 0,    -- 0 (всі), 1, або 2
            day_of_week INTEGER NOT NULL,  -- 1 (Пн) ... 5 (Пт)
            time_start TEXT NOT NULL,      -- '08:30'
            time_end TEXT NOT NULL,        -- '09:50'
            subject_name TEXT NOT NULL,    -- Звичайний текст з сайту
            teacher TEXT,
            room TEXT
        )
    ''')

    # 2. Таблиця університетських подій (З Excel)
    # Категорії: 'official', 'scientific', 'entertainment'
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS university_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            event_date DATE NOT NULL,      -- 'YYYY-MM-DD'
            event_time TEXT,               -- '14:00'
            location TEXT                  -- 'Актова зала', 'Ауд. 4105'
        )
    ''')

    # 3. Таблиця для персонального календаря студента (Дедлайни)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS personal_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            deadline_date DATETIME NOT NULL,
            is_completed BOOLEAN DEFAULT 0
        )
    ''')

    conn.commit()
    conn.close()
    print("Database structure successfully updated!")

def seed_initial_data():
    """Populates the database with test data for 3 IPZ groups and events."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # --- Schedule for IPZ-25-1, IPZ-25-2, IPZ-25-3 ---
    # subgroup: 0 (Whole group), 1 (First half), 2 (Second half)
    schedule_data = [
        # --- Group 1 ---
        ('ІПЗ-25-1', 0, 1, '08:30', '09:50', 'Higher Mathematics (Lecture)', 'Kovalenko', '4105'),
        ('ІПЗ-25-1', 1, 1, '10:05', '11:25', 'C++ Programming (Lab)', 'Ivanenko', '5201'),
        ('ІПЗ-25-1', 2, 1, '10:05', '11:25', 'Software Architecture (Lab)', 'Sydorenko', '5202'),
        
        # --- Group 2 ---
        ('ІПЗ-25-2', 0, 1, '08:30', '09:50', 'Higher Mathematics (Lecture)', 'Kovalenko', '4105'),
        ('ІПЗ-25-2', 1, 2, '12:00', '13:20', 'C++ Programming (Lab)', 'Ivanenko', '5201'),
        ('ІПЗ-25-2', 2, 2, '12:00', '13:20', 'Software Architecture (Lab)', 'Sydorenko', '5202'),

        # --- Group 3 ---
        ('ІПЗ-25-3', 0, 1, '08:30', '09:50', 'Higher Mathematics (Lecture)', 'Kovalenko', '4105'),
        ('ІПЗ-25-3', 1, 3, '08:30', '09:50', 'C++ Programming (Lab)', 'Ivanenko', '5201'),
        ('ІПЗ-25-3', 2, 3, '08:30', '09:50', 'Software Architecture (Lab)', 'Sydorenko', '5202')
    ]
    cursor.executemany('''
        INSERT INTO schedule (group_name, subgroup, day_of_week, time_start, time_end, subject_name, teacher, room)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', schedule_data)

    # --- Excel Events ---
    excel_events = [
        ('official', 'Open House Day', '2026-04-24', '10:00', 'Main Building'),
        ('official', 'Armed Forces Day', '2026-12-06', '12:00', 'Assembly Hall'),
        ('scientific', 'Math Conference', '2027-04-07', '09:00', '4105'),
        ('entertainment', 'Programmers Day', '2027-01-07', '18:00', 'Coworking')
    ]
    cursor.executemany('''
        INSERT INTO university_events (category, title, event_date, event_time, location)
        VALUES (?, ?, ?, ?, ?)
    ''', excel_events)

    conn.commit()
    conn.close()
    print("Test data for all 3 groups injected!")

# ==========================================
# API ДЛЯ ФРОНТЕНДЕРА (Функції для сторінок)
# ==========================================

def get_schedule(group_name, subgroup=0):
    """
    Для 'Сторінки розкладу'. 
    Повертає загальні пари (subgroup=0) ТА пари конкретної підгрупи (1 або 2).
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Вибираємо лекції (subgroup=0) і специфічні лаби (subgroup=?)
    cursor.execute('''
        SELECT day_of_week, time_start, time_end, subject_name, teacher, room, subgroup
        FROM schedule 
        WHERE group_name = ? AND (subgroup = 0 OR subgroup = ?)
        ORDER BY day_of_week, time_start
    ''', (group_name, subgroup))
    data = cursor.fetchall()
    conn.close()
    return data

def get_events(category):
    """
    Для трьох сторінок заходів.
    Передай сюди 'official', 'scientific' або 'entertainment'.
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT title, event_date, event_time, location 
        FROM university_events 
        WHERE category = ? 
        ORDER BY event_date ASC
    ''', (category,))
    data = cursor.fetchall()
    conn.close()
    return data

def clear_and_update_schedule(new_schedule_data):
    """
    Цю функцію ти викличеш пізніше, коли напишеш парсер з сайту ІФНТУНГ.
    Вона очистить старий розклад і запише свіжий.
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM schedule')
    cursor.executemany('''
        INSERT INTO schedule (group_name, subgroup, day_of_week, time_start, time_end, subject_name, teacher, room)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', new_schedule_data)
    conn.commit()
    conn.close()

if __name__ == '__main__':
    # Перезапуск бази з чистого аркуша
    import os
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)

    create_tables()
    seed_initial_data() 
    
    # ТЕСТ: Як це виглядає для ІПЗ-25-1 (Підгрупа 1)
    print("\n--- Розклад ІПЗ-25-1 (Підгрупа 1) ---")
    for lesson in get_schedule('ІПЗ-25-1', subgroup=1):
        print(lesson)

    # ТЕСТ: Наукові заходи
    print("\n--- Наукові заходи ---")
    for ev in get_events('scientific'):
        print(ev)