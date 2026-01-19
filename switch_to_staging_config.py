import os

# New staging credentials
new_url = 'https://rnjsfhphndexsqelkxvj.supabase.co'
new_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuanNmaHBobmNkZXhzcWVsa3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzYyOTksImV4cCI6MjA4NDQxMjI5OX0.a_Rs8YfssIjsz678O--WBGus5GssvsxD1yZL4D_QxcY'

# Current production credentials
old_url = 'https://vdeipnqyesduiohxvuvu.supabase.co'
old_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU'

public_dir = '/Users/willemienvesseur/Stage app/stage-connect-app/public'

for root, dirs, files in os.walk(public_dir):
    for file in files:
        if file.endswith(('.html', '.js')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content.replace(old_url, new_url).replace(old_key, new_key)
            
            if new_content != content:
                print(f"Updating {path} to STAGING")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

print("Done switching branch to staging config.")
