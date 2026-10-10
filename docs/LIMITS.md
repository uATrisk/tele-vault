# Platform Limits, Quotas & Bottlenecks

TeleVault is engineered to respect both Telegram Bot API and Cloudflare Workers Free Tier constraints.

---

## 1. Telegram Bot API Limits

| Resource | Limit | TeleVault Solution |
| :--- | :--- | :--- |
| **Max file size per upload** | 50 MB (standard Bot API) | Chunks fixed at 20 MB max. |
| **Broadcast rate limit** | 20 msgs / min to same channel | Upload queue throttles concurrency (max 2 parallel chunks). |
| **Storage retention** | Unlimited in private channels | All binary chunks retained indefinitely. |

---

## 2. Cloudflare Free Tier Limits

| Resource | Free Tier Limit | TeleVault Impact |
| :--- | :--- | :--- |
| **Worker Requests** | 100,000 requests / day | Ample for personal use (~5,000 file chunks/day). |
| **Worker CPU Time** | 10 ms / request | Chunk proxying streams without CPU overhead. |
| **D1 Storage** | 5 GB storage, 5M reads/day | Metadata only requires ~1 KB per photo. Easily holds millions of photos. |
