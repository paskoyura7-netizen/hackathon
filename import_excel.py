import openpyxl
import sqlite3

DB_NAME = 'student_calendar.db'
EXCEL_FILE = 'events.xlsx'

def import_events_from_excel():
    print(f"Читаємо файл {EXCEL_FILE} без Pandas...")
    
    try:
        # Відкриваємо Excel файл напряму
        workbook = openpyxl.load_workbook(EXCEL_FILE)
        sheet = workbook.active
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Очищаємо старі події
        cursor.execute("DELETE FROM university_events")
        
        events_to_insert = []
        
        # Перебираємо рядки (min_row=2 означає, що ми пропускаємо перший рядок із заголовками)
        for row in sheet.iter_rows(min_row=2, values_only=True):
            # Якщо рядок порожній - пропускаємо
            if not row[0]: 
                continue
                
            category = str(row[0]).strip()
            title = str(row[1]).strip()
            
            # Обробка дати (іноді Excel віддає дату з часом, відрізаємо його)
            raw_date = str(row[2]).strip().replace('.', '-')
            clean_date = raw_date.split(' ')[0] 
            
            # Захист від порожніх клітинок локації
            location = str(row[3]).strip() if len(row) > 3 and row[3] is not None else ''
            
            events_to_insert.append((
                category,
                title,
                clean_date,
                '',  # Порожній час
                location
            ))
            
        cursor.executemany('''
            INSERT INTO university_events (category, title, event_date, event_time, location)
            VALUES (?, ?, ?, ?, ?)
        ''', events_to_insert)
        
        conn.commit()
        conn.close()
        print(f"Успіх! Імпортовано {len(events_to_insert)} подій!")
        
    except FileNotFoundError:
        print(f"Помилка: Файл '{EXCEL_FILE}' не знайдено.")
    except Exception as e:
        print(f"Сталася помилка: {e}")

if __name__ == '__main__':
    import_events_from_excel()