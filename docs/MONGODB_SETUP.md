# MongoDB Setup (No Docker Required)

Docker isn't working? Use **MongoDB Atlas** (free cloud) — takes 2 minutes.

## Step 1: Create free MongoDB Atlas cluster

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create a **FREE** cluster (M0 Sandbox)
4. Create database user: **Database Access** → Add New → set username/password
5. Allow network access: **Network Access** → Add IP → **Allow Access from Anywhere** (0.0.0.0/0) for dev
6. Get connection string: **Database** → **Connect** → **Connect your application** → copy the URI

It looks like:
```
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/maxro?retryWrites=true&w=majority
```

Replace `USERNAME` and `PASSWORD` with your database user.

## Step 2: Add to .env

Create or edit `c:\Users\every\Maxro\.env`:

```
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/maxro?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Step 3: Run the app

```powershell
cd c:\Users\every\Maxro
.\start-dev.ps1
```

No Docker needed.
