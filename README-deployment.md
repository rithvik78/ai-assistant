# Render Deployment Guide

## Free Deployment on Render

### Prerequisites
1. GitHub account
2. OpenRouter API key
3. Push your code to GitHub

### Step 1: Prepare Your Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-chat.git
git push -u origin main
```

### Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: `ai-assistant-backend`
   - **Environment**: `Python`
   - **Build Command**: `cd api && pip install -r requirements-minimal.txt`
   - **Start Command**: `cd api && python main.py`
   - **Environment Variables**:
     - `OPENROUTER_API_KEY`: Your OpenRouter API key

### Step 3: Deploy Frontend on Render

1. Click "New +" → "Static Site"
2. Connect the same GitHub repository
3. Use these settings:
   - **Name**: `ai-assistant-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://YOUR-BACKEND-NAME.onrender.com`

### Alternative: Manual Docker Deployment

If you prefer Docker:

1. Create a Render account
2. Use "New +" → "Web Service"
3. Choose "Deploy an existing image from a registry"
4. Build and push your Docker image to Docker Hub first

### Limitations of Free Tier

- **Sleep after 15 min inactivity** (first request after sleep takes ~30 seconds)
- **512MB RAM** (sufficient for this app)
- **No persistent storage** (data resets on restart)
- **750 hours/month** (enough for continuous hosting)

### Production Considerations

For production use, consider:
- **Paid plan** ($7/month) for no sleep
- **Persistent storage** for database
- **Environment-specific configurations**
- **Database backup strategy**