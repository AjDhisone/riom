# RIOM Backend - Render Deployment Guide

This guide will walk you through deploying the RIOM backend to Render.com.

## Prerequisites

Before deploying, ensure you have:

1. ✅ A [Render account](https://render.com) (free tier available)
2. ✅ A [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas) (free tier available)
3. ✅ Your code pushed to GitHub
4. ✅ Your frontend URL (for CORS configuration)

---

## Step 1: Set Up MongoDB Atlas

### 1.1 Create a MongoDB Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Sign in or create a new account
3. Click **"Create a New Cluster"** or use an existing one
4. Select **FREE tier** (M0 Sandbox)
5. Choose your preferred region (closest to your users)
6. Click **"Create Cluster"** (takes 3-5 minutes)

### 1.2 Create Database User

1. In your cluster, click **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter:
   - Username: `riom_admin` (or your choice)
   - Password: Generate a strong password and **SAVE IT**
5. Set user privileges to **"Read and write to any database"**
6. Click **"Add User"**

### 1.3 Whitelist IP Addresses

1. Click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is necessary for Render's dynamic IPs
4. Click **"Confirm"**

### 1.4 Get Connection String

1. Go to **"Database"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** as the driver
5. Copy the connection string (looks like):
   ```
   mongodb+srv://riom_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual database password
7. Add your database name before the `?` (e.g., `/riom`):
   ```
   mongodb+srv://riom_admin:yourpassword@cluster0.xxxxx.mongodb.net/riom?retryWrites=true&w=majority
   ```

**SAVE THIS CONNECTION STRING - you'll need it for Render!**

---

## Step 2: Deploy to Render

### 2.1 Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** button
3. Select **"Web Service"**

### 2.2 Connect GitHub Repository

1. Click **"Connect account"** if not already connected
2. Select your GitHub account
3. Search for **"riom"** repository
4. Click **"Connect"**

### 2.3 Configure Web Service

Fill in the following details:

**Basic Settings:**
- **Name:** `riom-backend` (or your choice)
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** Leave empty (or `RIOM-SERVER` if needed)
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Instance Type:**
- Select **"Free"** (or upgrade as needed)

### 2.4 Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `MONGODB_URI` | `your-mongodb-atlas-connection-string` | From Step 1.4 |
| `SESSION_SECRET` | `generate-strong-32-char-random-string` | See below* |
| `SESSION_COOKIE_NAME` | `riom.sid` | Optional, default is fine |
| `CORS_ORIGIN` | `https://your-frontend-url.com` | Your frontend URL |
| `PORT` | `5000` | Optional, Render provides this |

**\*To generate a strong SESSION_SECRET:**

Run this command in your terminal:
```bash
# Windows (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Mac/Linux
openssl rand -base64 32
```

Or use an online generator: https://randomkeygen.com/

**Example Configuration:**

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://riom_admin:MyP@ssw0rd@cluster0.abc123.mongodb.net/riom?retryWrites=true&w=majority
SESSION_SECRET=a8f5f167f44f4964e6c998dee827110c
SESSION_COOKIE_NAME=riom.sid
CORS_ORIGIN=https://riom-frontend.onrender.com
```

> **Important:** Replace these with your actual values!

### 2.5 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Start your server (`npm start`)
3. Wait 3-5 minutes for initial deployment

### 2.6 Verify Deployment

Once deployed, you'll see:
- ✅ Green "Live" status
- Your service URL: `https://riom-backend.onrender.com`

Test your API:
```bash
curl https://riom-backend.onrender.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Healthy",
  "data": {
    "status": "ok"
  }
}
```

---

## Step 3: Configure Your Frontend

Update your frontend to use the Render backend URL:

```javascript
// In your frontend .env or config
REACT_APP_API_URL=https://riom-backend.onrender.com/api
# or
VITE_API_URL=https://riom-backend.onrender.com/api
```

**Update CORS_ORIGIN on Render:**
1. Go to your Render service
2. Click **"Environment"** tab
3. Update `CORS_ORIGIN` with your actual frontend URL
4. Click **"Save Changes"**
5. Service will automatically redeploy

---

## Step 4: Create First User (Optional)

Since this is your first deployment, you need to create an admin user.

You can:

**Option A: Use API endpoint directly**
```bash
curl -X POST https://riom-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

**Option B: Use your frontend registration page**

Just register normally and update the role in MongoDB Atlas if needed.

---

## Monitoring & Maintenance

### View Logs

1. Go to your Render service dashboard
2. Click the **"Logs"** tab
3. Monitor real-time logs for errors or issues

### Monitor Performance

1. Check the **"Metrics"** tab for:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

### Auto-Deploy on Git Push

Render automatically deploys when you push to the `main` branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render will detect the push and redeploy automatically.

### Troubleshooting

**Issue: "Application failed to respond"**
- Check logs for errors
- Verify `MONGODB_URI` is correct
- Ensure MongoDB Atlas IP whitelist includes 0.0.0.0/0

**Issue: "CORS errors"**
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Check that credentials are enabled in frontend requests

**Issue: "Session not persisting"**
- Verify `SESSION_SECRET` is set
- Check that `NODE_ENV=production`
- Ensure cookies are enabled in browser

**Issue: "Cannot connect to MongoDB"**
- Verify connection string format
- Check database user credentials
- Ensure network access is configured

---

## Render Free Tier Limitations

🔔 **Important to know:**

1. **Spin Down:** Free services spin down after 15 minutes of inactivity
2. **Cold Start:** First request after spin down takes ~30 seconds
3. **Bandwidth:** 100 GB/month
4. **Build Minutes:** 400 minutes/month
5. **Multiple Services:** Up to 10 free services

**To prevent spin down (optional):**
- Upgrade to paid plan ($7/month)
- Use a cron service to ping your API every 10 minutes
- Deploy a keep-alive service

---

## Security Checklist

Before going live, ensure:

- ✅ `SESSION_SECRET` is a strong random string (not default)
- ✅ `MONGODB_URI` uses a strong password
- ✅ `CORS_ORIGIN` is set to your actual frontend URL (not *)
- ✅ MongoDB Atlas IP whitelist is configured
- ✅ Environment variables are not committed to Git
- ✅ All dependencies are up to date (`npm audit`)
- ✅ HTTPS is enabled (Render does this automatically)

---

## Updating Environment Variables

To update environment variables after deployment:

1. Go to your Render service dashboard
2. Click **"Environment"** tab
3. Edit or add variables
4. Click **"Save Changes"**
5. Service automatically redeploys

---

## Database Backups

### MongoDB Atlas Backups (Recommended)

1. Go to your MongoDB Atlas cluster
2. Click **"Backup"** tab
3. Enable **"Continuous Backup"** (requires paid cluster)
4. Or upgrade to M2+ tier for automated backups

### Manual Backup

Export your data periodically:

```bash
# Install MongoDB tools
mongodump --uri="your-mongodb-connection-string" --out=backup/

# Restore if needed
mongorestore --uri="your-mongodb-connection-string" backup/
```

---

## Scaling Up

When your app grows:

1. **Upgrade Render Plan:**
   - Go to **"Settings"** > **"Instance Type"**
   - Choose Starter ($7/mo) or higher
   - Get dedicated resources and no spin down

2. **Upgrade MongoDB:**
   - Go to MongoDB Atlas
   - Upgrade to M2 or higher tier
   - Get better performance and automated backups

3. **Add Custom Domain:**
   - Go to **"Settings"** > **"Custom Domain"**
   - Add your domain (e.g., api.yourdomain.com)
   - Update DNS records as shown

---

## Support & Resources

- **Render Documentation:** https://render.com/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com
- **GitHub Issues:** https://github.com/AjDhisone/riom/issues

---

## Quick Reference: Environment Variables

Copy this template and fill in your values:

```bash
# Required
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/riom?retryWrites=true&w=majority
SESSION_SECRET=your-32-character-random-string
CORS_ORIGIN=https://your-frontend-url.com

# Optional (with defaults)
SESSION_COOKIE_NAME=riom.sid
PORT=5000
```

---

**🎉 Congratulations! Your RIOM backend is now live on Render!**

Your API endpoint: `https://riom-backend.onrender.com/api`

Test it: `https://riom-backend.onrender.com/api/health`
