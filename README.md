# SmartPay（Web Prototype）

以 Vite + React + TypeScript 做的手機介面原型（四頁：首頁／卡片／支付／出國），並可透過 Python 抓取中信官網信用卡清單 JSON，讓「我的卡片中心」顯示真實卡片資料。

## 開發啟動

```bash
cd smartpay-web
npm install
npm run dev
```

## 爬蟲資料（`public/credit_cards_data.json`）

前端會用 `fetch('/credit_cards_data.json')` 讀取靜態檔案，所以 JSON 必須存在於 `smartpay-web/public/credit_cards_data.json`。

### 安全模式（預設）

```bash
cd smartpay-web
pip3 install -r requirements.txt
python3 fetch.py
```

### 不安全模式（只建議除錯用）

若你在公司/校園網路遇到 SSL 憑證驗證失敗（例如 `CERTIFICATE_VERIFY_FAILED`），可暫時略過驗證：

```bash
python3 fetch.py --insecure
```

注意：`--insecure` 會略過 TLS 憑證驗證，不建議用於正式環境。

### 檔案大小（避免 repo 過大）

`fetch.py` 預設會輸出「瘦身版 JSON」且只保留前 50 張卡，減少 `credit_cards_data.json` 體積：

- `--limit 20`：只輸出前 20 張
- `--no-slim`：輸出完整原始 JSON（檔案會很大，不建議 commit）

```bash
python3 fetch.py --insecure --limit 30
```
