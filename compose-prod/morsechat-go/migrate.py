# This script was used to migrate the mariadb database of the
# previos version into the sqlite database of the new golang version
import sqlite3
import csv

database_path = "db.sqlite"
csv_path = "step2.csv"

# Database connection
conn = sqlite3.connect(database_path)
cursor = conn.cursor()

# Open the CSV file and import the specified fields
with open(csv_path, 'r') as file:
    csv_reader = csv.DictReader(file, quotechar="'")  # Specify double quotes as the quote character

    for row in csv_reader:
        print(row)
        # Extract only the needed fields
        callsign = row['callsign']
        country = callsign[:2].upper()
        username = row['username']
        password = row['password']
        registration_timestamp = row['registration_timestamp']
        settings = row['settings']  # Assuming 'settings' corresponds to 'config'

        # Insert the extracted fields into the 'users' table
        cursor.execute('''
            INSERT INTO users (username, password, callsign, country, settings, registration_session, registration_timestamp, last_online_timestamp)
            VALUES (?,?,?,?,?,?,?,?)
        ''', (username, password, callsign, country, settings, "", registration_timestamp, registration_timestamp))

# Commit changes and close the connection
conn.commit()
conn.close()

print("Data imported successfully into the 'users' table.")
