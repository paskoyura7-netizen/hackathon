import json
import sqlite3
from datetime import datetime
import re

DB_NAME = 'student_calendar.db'
JSON_FILE = 'json01.txt' # Вказуємо твій новий файл

def import_schedule():
    print(f"Читаємо файл {JSON_FILE}...")
    
    try:
        # Зчитуємо сирий файл
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            raw_content = f.read()
            
        # МАГІЯ: Знаходимо місця, де стикаються дві групи (між "}}" та "{") і ставимо кому
        clean_content = re.sub(r'\}\}\s*\{"psrozklad_export"', '}},\n{"psrozklad_export"', raw_content)
        # Загортаємо все у квадратні дужки, щоб вийшов валідний JSON-масив
        clean_content = f"[{clean_content}]"
        
        # Перетворюємо текст на словники Python
        data_list = json.loads(clean_content)
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Очищуємо базу перед новим записом
        cursor.execute("DELETE FROM schedule")
        events_to_insert = []
        
        # Перебираємо всі групи
        for item in data_list:
            # Дістаємо список пар для конкретної групи
            roz_items = item.get('psrozklad_export', {}).get('roz_items', [])
            
            for lesson in roz_items:
                desc = lesson.get('lesson_description', '').strip()
                
                # Пропускаємо порожні вікна і скасовані пари
                if not desc or "Заняття відмінено" in desc:
                    continue
                    
                group = lesson.get('object', '')
                date_str = lesson.get('date', '')
                time_str = lesson.get('lesson_time', '')
                
                # Визначаємо день тижня з дати (1 - Пн, 5 - Пт)
                try:
                    dt = datetime.strptime(date_str, "%d.%m.%Y")
                    day = dt.weekday() + 1
                except ValueError:
                    day = 1
                    
                times = time_str.split('-')
                time_start = times[0].strip() if len(times) > 0 else ''
                time_end = times[1].strip() if len(times) > 1 else ''
                
                # Прибираємо слово "дистанційно", якщо воно приліпилося до назви
                desc = desc.replace("дистанційно", "")
                
                # Розділяємо паралельні підгрупи (вони розділені подвійним пробілом)
                parts = [p.strip() for p in desc.split('  ') if p.strip()]
                
                for part in parts:
                    subgroup = 0
                    if '(підгр. 1)' in part or '(підгр.1)' in part:
                        subgroup = 1
                    elif '(підгр. 2)' in part or '(підгр.2)' in part:
                        subgroup = 2
                        
                    events_to_insert.append((
                        group, subgroup, day, time_start, time_end, part, '', ''
                    ))
                    
        # Записуємо масив пар у базу даних
        cursor.executemany('''
            INSERT INTO schedule (group_name, subgroup, day_of_week, time_start, time_end, subject_name, teacher, room)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', events_to_insert)
        
        conn.commit()
        conn.close()
        print(f"Супер! Успішно розпарсено та збережено {len(events_to_insert)} пар.")
        
    except FileNotFoundError:
        print(f"Помилка: Файл '{JSON_FILE}' не знайдено в папці.")
    except json.JSONDecodeError as e:
        print(f"Помилка структури JSON: {e}")
    except Exception as e:
        print(f"Неочікувана помилка: {e}")

if __name__ == '__main__':
    import_schedule()