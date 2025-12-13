# Deployment Guide — Stage Connect App

## Option A: Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account (to push your repo)
- Vercel account (free tier: https://vercel.com)
- Supabase project set up (already done ✓)

### Steps

1. **Push code to GitHub**
   ```bash
   # Initialize git if not already done
   git init
   git add .
   git commit -m "Initial commit: Stage Connect App with Supabase integration"
   git remote add origin https://github.com/YOUR_USERNAME/stage-connect-app.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Select "Import Git Repository"
   - Paste: `https://github.com/YOUR_USERNAME/stage-connect-app.git`
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel project settings → "Environment Variables"
   - Add two variables:
     - **SUPABASE_URL**: `https://ninkkvffhvkxrrxddgrz.supabase.co`
     - **SUPABASE_ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTY2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Your app will be live at `https://your-project.vercel.app`

5. **Add Custom Domain** (Optional but Recommended)
   - Go to Settings → Domains
   - Click "Add Domain"
   - Enter: `stageconnectie.nl`
   - Configure DNS at your domain registrar (see below)
   - Wait for DNS propagation (10-30 minutes)
   - SSL certificate is automatically provisioned

### DNS Configuration for stageconnectie.nl

Add these records at your domain registrar (e.g., TransIP):

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Post-Deployment Checklist
- ✅ Test login page works at `https://stageconnectie.nl`
- ✅ Test admin dashboard
- ✅ Test Supabase connection (check browser console for errors)
- ✅ Add custom domain (optional): Vercel project settings → Domains

---

## Option B: Deploy to Netlify

Similar to Vercel, but:
1. Go to https://netlify.com/drop
2. Connect your GitHub repo
3. Set environment variables in Netlify site settings
4. Deploy

---

## Option C: Local Server / VPS Deployment

If you prefer to host on your own server:

```bash
# Build locally
export SUPABASE_URL='https://ninkkvffhvkxrrxddgrz.supabase.co'
export SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM'
npm run build

# Upload the 'build' folder to your web server
# (e.g., via SFTP, SCP, or Git)
# Then serve static files with nginx/apache
```

---

## Troubleshooting

### Build fails on Vercel
- Check build logs: Vercel dashboard → project → Deployments → failed build → Logs
- Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Environment Variables
- Run `npm run build` locally to test

### App crashes after deployment
- Open browser DevTools (F12) → Console
- Check for errors related to Supabase connection
- Verify that Supabase RLS policies are not blocking queries

### "Cannot find module" errors
- Run `npm install` locally and commit `package-lock.json`
- Ensure all dependencies are in `package.json`

---

## Security Notes

⚠️ **Important**: The `SUPABASE_ANON_KEY` is public (it's meant for client-side use). 
- However, protect it in your repository (use `.env.local` locally, env vars in CI/CD).
- Use Supabase RLS policies to restrict database access per user.
- Never commit `.env.local` — add it to `.gitignore`.

---

## Next Steps

1. Choose your hosting platform (A, B, or C)
2. Follow the steps above
3. Test the deployment thoroughly
4. Add real data to Supabase (bedrijven, studenten)
5. Promote admins via SQL or Supabase dashboard

Good luck! 🚀
