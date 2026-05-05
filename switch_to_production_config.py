import os

# Production URL and Key (StageConnectie-EU)
prod_url = 'https://vdeipnqyesduiohxvuvu.supabase.co'
prod_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU'

# Staging URL and Key to replace
staging_url = 'https://rnjsfhphncdexsqelkxv.supabase.co'
staging_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuanNmaHBobmNkZXhzcWVsa3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzYyOTksImV4cCI6MjA4NDQxMjI5OX0.a_Rs8YfssIjsz678O--WBGus5GssvsxD1yZL4D_QxcY'

# Root directory for searching files
root_dir = '/Users/willemienvesseur/Stage app/stage-connect-app'

print("🔄 Switching back to PRODUCTION config...")

for root, dirs, files in os.walk(root_dir):
    # Exclude node_modules to be faster
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
        
    for file in files:
        if file.endswith(('.html', '.js')):
            path = os.path.join(root, file)
            # Skip the script itself
            if 'switch_to' in file:
                continue
                
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content.replace(staging_url, prod_url).replace(staging_key, prod_key)
                
                if new_content != content:
                    print(f"✅ Updated {path} to PRODUCTION")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
            except Exception as e:
                print(f"⚠️ Could not read {path}: {e}")

print("\n✨ Done! Your project is now pointing to StageConnectie-EU (Production).")
