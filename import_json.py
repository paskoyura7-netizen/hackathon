import sqlite3
from datetime import datetime
import re
import json

DB_NAME = 'student_calendar.db'
JSON_FILE = 'schedule_data.json'

def import_bulletproof_schedule():
    print(f"Запускаємо Regex-сканер для {JSON_FILE}...")
    
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Магія: Регулярний вираз, який ізолює кожну пару окремо, ігноруючи зламану загальну структуру
        pattern = r'\{\s*"object"\s*:\s*"[^"]+".*?"lesson_description"\s*:\s*"[^"]*"\s*\}'
        matches = re.findall(pattern, content, flags=re.DOTALL)
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Очищуємо старий розклад
        cursor.execute("DELETE FROM schedule")
        
        events_to_insert = []
        
        for match in matches:
            try:
                # Прибираємо випадкові переноси рядків всередині знайденого блоку
                clean_match = match.replace('\n', ' ')
                lesson = json.loads(clean_match)
                
                desc = lesson.get('lesson_description', '').strip()
                
                # Пропускаємо порожні вікна та скасовані пари
                if not desc or "Заняття відмінено" in desc:
                    continue
                    
                group = lesson.get('object', '')
                date_str = lesson.get('date', '')
                time_str = lesson.get('lesson_time', '')
                
                # Перетворюємо дату на день тижня
                try:
                    dt = datetime.strptime(date_str, "%d.%m.%Y")
                    day_of_week = dt.weekday() + 1
                except ValueError:
                    day_of_week = 1
                    
                times = time_str.split('-')
                time_start = times[0].strip() if len(times) > 0 else ''
                time_end = times[1].strip() if len(times) > 1 else ''
                
                # Розділяємо паралельні лабораторні
                parts = [p.strip() for p in desc.split('  ') if p.strip()]
                
                for part in parts:
                    subgroup = 0
                    if '(підгр. 1)' in part or '(підгр.1)' in part:
                        subgroup = 1
                    elif '(підгр. 2)' in part or '(підгр.2)' in part:
                        subgroup = 2
                        
                    events_to_insert.append((
                        group, subgroup, day_of_week, time_start, time_end, part, '', ''
                    ))
                    
            except json.JSONDecodeError:
                # Якщо сканер зачепив зламаний шматок тексту - просто ігноруємо цю одну пару і йдемо далі
                continue
                
        # Масово записуємо в базу
        cursor.executemany('''
            INSERT INTO schedule (group_name, subgroup, day_of_week, time_start, time_end, subject_name, teacher, room)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', events_to_insert)
        
        conn.commit()
        conn.close()
        print(f"Успіх! Сканер оминув пошкодження і зберіг {len(events_to_insert)} пар у базу.")
        
    except FileNotFoundError:
        print(f"Помилка: Файл '{JSON_FILE}' не знайдено.")

if __name__ == '__main__':
    import_bulletproof_schedule()