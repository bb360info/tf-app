# Infrastructure Setup Guide

> **Context**: This guide focuses on maximum availability in China (Mainland) without an ICP license, using Hong Kong as a bridge.

## 1. Server (VPS) Selection

The critical requirement is **China-optimized routing** (CN2 GIA). Standard US/EU servers will be slow or blocked.

### Recommended Providers (Hong Kong Region)

1.  **Aeza** (Budget-friendly, good for RU payments)
    *   **Tariff**: "Promo" or "Shared" in Hong Kong.
    *   **Specs**: 2 vCPU, 4GB RAM is ideal for PocketBase + Docker.
    *   **Pros**: Accepts RU cards/crypto, often has CN2 routing.
2.  **Vultr** (Global standard)
    *   **Region**: Hong Kong.
    *   **OS**: Ubuntu 24.04 LTS.
    *   **Pros**: Reliable, hourly billing.
3.  **Hetzner** (NOT Recommended)
    *   Good for Europe, but latency to China is poor. Avoid for this project unless using a separate CDN (which we are avoiding due to complexity).

### Initial Setup (Ubuntu)

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Setup Firewall (UFW)
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
ufw enable
```

---

## 2. Cloudflare R2 Setup (Storage)

Migration from local storage to R2 allows infinite scaling and cheaper costs than AWS S3 ($0 egress fees).

### Step 2.1: Create Bucket

1.  Log in to Cloudflare Dashboard.
2.  Go to **R2** from the sidebar.
3.  Click **Create Bucket**.
4.  Name: `jump-storage` (or similar).
5.  Location: **Automatic** (or APAC if available).
6.  Click **Create Bucket**.

### Step 2.2: Public Access (Result: `https://files.yourdomain.com`)

Since `r2.dev` domains are often blocked in China, use a custom domain.

1.  Go to your bucket settings -> **Settings** tab.
2.  Scroll to **Public Access** -> **Custom Domains**.
3.  Click **Connect Domain**.
4.  Enter `files.yourdomain.com` (replace with your actual domain).
5.  Ensure your domain sends traffic to Cloudflare (DNS proxied, orange cloud).

### Step 2.3: CORS Policy

PocketBase needs to upload directly from the browser (optional) or serve via API. Set permissive CORS for development, restrict later.

In Bucket Settings -> **CORS Policy**:
```json
[
  {
    "AllowedOrigins": ["*"], // Change to https://yourdomain.com in production
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Step 2.4: API Tokens (Needed for PocketBase)

1.  Go to R2 Overview -> **Manage R2 API Tokens** (top right).
2.  Click **Create API Token**.
3.  Name: `pocketbase-admin`.
4.  Permissions: **Admin Read & Write**.
5.  TTL: Does not expire (or 1 year).
6.  **SAVE THESE IMMEDIATELY**:
    *   Access Key ID
    *   Secret Access Key
    *   Endpoint (Generic S3 API): `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## 3. PocketBase S3 Integration

Configure PocketBase to use R2 instead of local disk.

1.  Open PocketBase Admin UI (`https://pb.yourdomain.com/_/`).
2.  Go to **Settings** -> **Files storage**.
3.  Toggle **Use S3 storage**.
4.  Fill in details:
    *   **S3 API Endpoint**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (Exclude the bucket name!)
    *   **Bucket**: `jump-storage`
    *   **Region**: `auto` (or `us-east-1` usually works best for R2 compatibility)
    *   **Access Key**: (From Step 2.4)
    *   **Secret**: (From Step 2.4)
    *   **Force path-style**: ✅ Checked (Critical for R2)
5.  Click **Test connection** -> **Save changes**.

---

## 4. Verification

1.  Upload a file in PocketBase "Files" collection.
2.  Check the file URL. It should use your S3/R2 domain.
3.  Verify the file loads in a browser (check headers for `cf-cache-status`).
