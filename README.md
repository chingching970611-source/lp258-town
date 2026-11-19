# 🏡 LP 258 小鎮

一個俾大家重新連繫嘅 community web app：Q 版 Avatar 喺小鎮行嚟行去，睇到邊個朋友在綫、傾偈、一齊玩遊戲、睇 HQ 最新活動。

## 啟動

需要 Node.js 18 或以上（唔使 `npm install`，冇任何 dependency）。

```powershell
node server.js
```

- 小鎮：http://localhost:3000
- Host 後台：http://localhost:3000/admin

第一次啟動會自動產生後台密碼，儲存喺 `data/admin-password.txt`。登入後可以喺「⚙️ 設定」更改密碼（改咗之後嗰個檔案會自動刪除）。亦可以用環境變數設定：

```powershell
$env:ADMIN_PASSWORD = "你嘅密碼"; node server.js
```

所有資料（成員、活動、題目、積分）都存喺 `data/db.json`，記得備份。

## 功能

**小鎮（成員）**
- Q 版 Avatar：膚色、髮型、髮色、衫款、衫色、表情、配飾，再加暱稱同狀態
- 點擊地面 / WASD / 方向鍵行走；點擊朋友可以 👋 打招呼、💬 私訊、🚶 行過去
- 即時聊天（頭頂會出對話泡泡）、表情動作、在綫朋友列表
- 四個區域：📍 HQ 活動中心、🎮 Game Zone、☕ 聊天 Café、🏆 積分榜（頒獎台會顯示頭三名）
- Game Zone：❓ 問答、🧩 猜謎、⭐ 小遊戲「接星星」、🏅 LP Challenge（提交後 Host 審核加分）
- HQ：即將舉行活動（日期、時間、場地、地址、內容）、活動記錄、🔔 提醒我、📅 加入日曆 (.ics)、🗺️ 地圖
- 活動前 24 小時頂部提示；活動前 1 小時通知（開咗瀏覽器通知仲會彈出系統通知）
- 「我的」入面有登入碼，可以喺其他裝置登入同一個帳號

**Host 後台（只有管理員）**
- 📊 概覽：在綫人數、成員、待審核、下一個活動
- 📍 活動：新增 / 編輯 / 刪除、填寫活動記錄、睇邊個會出席、📣 即時推送提醒
- ❓ 問答 / 🧩 猜謎 / 🏅 LP Challenge：管理題目同挑戰
- ⚡ 即時問答：一撳推送題目畀所有在綫成員，限時作答，最快答啱額外 +5
- ✅ 審核 LP Challenge 提交（通過自動加分）
- 👥 成員：調整積分、停用 / 恢復帳號
- 📢 公告：即時彈出畀所有人，顯示喺小鎮頂部

## 免費上線（Render 免費方案 + GitHub Gist 存資料）

Render 免費方案每次重啟都會清空硬碟，所以資料會自動備份去一個私密 GitHub Gist。

1. 喺 https://gist.github.com 開一個 **Secret gist**，檔名 `lp258-db.json`，內容 `{}`。網址最尾嗰串就係 `GIST_ID`。
2. 喺 https://github.com/settings/tokens/new 開一個 **classic token**，只剔 `gist`，冇限期（或者揀長啲），呢個就係 `GITHUB_TOKEN`。
3. 用 GitHub 登入 https://dashboard.render.com → **New → Blueprint** → 揀 `lp258-town` repo。
4. 填 `ADMIN_PASSWORD`（後台密碼）、`GIST_ID`、`GITHUB_TOKEN` → **Apply**。
5. 幾分鐘後就有 `https://lp258-town.onrender.com` 之類嘅網址，可以分享畀朋友。

免費方案限制：冇人用 15 分鐘會瞓覺，第一個人入嚟要等大約 1 分鐘先醒。

## 上線前要留意
- 帳號係「暱稱 + 登入碼」，冇 email / 密碼；登入碼唔見咗就無法登入嗰個帳號。
- 正式上線請放喺 HTTPS 後面（例如 Nginx / Caddy / Render / Railway），並設定 `ADMIN_PASSWORD`。
- 單一伺服器、JSON 檔儲存，適合幾十至幾百人嘅社群。
