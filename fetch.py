import requests
import json
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import logging
import os
import time
import certifi
import argparse
from typing import Any, Dict, List, Optional

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

CTBC_CARDLIST_URL = "https://www.ctbcbank.com/web/content/twrbo/setting/creditcards.cardlist.json?IIhfvu=1wsT4Kik3xCVvd1PlbDRm6KnpQ6tOKZsCGhoTHBZoqotrhKtvSGKYATXmzo3j9uUQMJMwWxAuwB99ygP4cqfCnwClbJpbKGcWE.PA2lEsPP9A9dfNlN3B7heaDReXK_Ve.GjDZAefe7FH.m4AhSpS0KAOvrlijn5qIeOlEhzPlmTnZXEEnNEDZZt5hNrkqgLqQLqHWfOWpMgC0f_yX6fIMp.bktqGb4G1ACgUU0nCZDPZXcOh3AwxfL67g5HGArp2WbDi7p1lwStbQltLUWwmtaGlp.qU5n9FeDqMe0xo5OVUeqIr9y3aAuoFHkoN5CMuLu9aRct4at39.dY4i8Ajm3zCyKxlJU2cIiUihcEB3ZTDgpDYEwAzXBYcA"


def _project_public_json_path(filename: str) -> str:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    return os.path.join(public_dir, filename)


def _slim_card(card: Dict[str, Any]) -> Dict[str, Any]:
    """
    只保留前端會用到的欄位，避免 JSON 太大不適合放進 repo。
    """
    keep_keys = [
        "cardId",
        "cardName",
        "cardImg",
        "cardFeature",
        "cardFeatureHighlight",
        "issueGroup",
        "introLink",
        "applyLink",
        "starRate",
        "shortIntro",
        "rewardType",
        "cardType",
        "shopType",
        "smartChoose",
        "extraFunction",
    ]
    return {k: card.get(k) for k in keep_keys if k in card}


def fetch_credit_cards(limit: int = 50, slim: bool = True) -> Optional[Dict[str, Any]]:
    """
    抓取中信銀行信用卡列表數據
    """
    url = CTBC_CARDLIST_URL
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    try:
        print("正在發送請求...")
        # 預設使用 certifi 驗證；若遇到公司/校園網路 HTTPS 代理造成憑證異常，可用 --insecure 暫時跳過驗證
        verify_opt = certifi.where()
        if os.environ.get("CTBC_INSECURE_SSL") == "1":
            verify_opt = False
            print("⚠️ 已啟用不安全模式：略過 SSL 憑證驗證（僅建議用於除錯）")

        response = requests.get(url, headers=headers, timeout=15, verify=verify_opt)
        response.raise_for_status()
        
        # 解析 JSON 響應
        data = response.json()
        raw_cards: List[Dict[str, Any]] = data.get('creditCards', []) or []
        if limit and limit > 0:
            raw_cards = raw_cards[:limit]
        cards = [_slim_card(c) for c in raw_cards] if slim else raw_cards

        print(f"✓ 成功抓取數據，共 {len(cards)} 張信用卡")
        
        # 準備輸出數據
        output_data = {
            "fetchTime": datetime.now().isoformat(),
            "totalCards": len(cards),
            "creditCards": cards
        }
        
        # 保存到 JSON 檔案
        # Vite 會從 public/ 直接提供靜態檔案，所以要輸出到 smartpay-web/public/
        output_file = _project_public_json_path("credit_cards_data.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"✓ 數據已保存到 {output_file}")
        logger.info(f"成功抓取並保存 {len(cards)} 張信用卡")
        
        return output_data
        
    except requests.exceptions.RequestException as e:
        print(f"✗ 請求失敗: {e}")
        logger.error(f"請求失敗: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"✗ JSON 解析失敗: {e}")
        logger.error(f"JSON 解析失敗: {e}")
        return None

def start_scheduler(limit: int = 50, slim: bool = True):
    """
    啟動背景排程器，每小時執行一次抓取任務
    """
    scheduler = BackgroundScheduler()
    
    # 添加每小時執行一次的任務
    scheduler.add_job(
        func=lambda: fetch_credit_cards(limit=limit, slim=slim),
        trigger="interval",
        hours=1,
        id='fetch_credit_cards_job',
        name='抓取信用卡數據',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("✓ 排程器已啟動，將每小時執行一次抓取任務")
    print("✓ 排程器已啟動，將每小時執行一次抓取任務")
    
    # 確保程式關閉時排程器也關閉
    atexit.register(lambda: scheduler.shutdown())
    
    return scheduler

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="抓取中信信用卡列表 JSON，輸出到 smartpay-web/public/credit_cards_data.json")
    parser.add_argument("--daemon", action="store_true", help="啟用排程器（每小時抓取一次）")
    parser.add_argument("--insecure", action="store_true", help="略過 SSL 憑證驗證（僅除錯用）")
    parser.add_argument("--limit", type=int, default=50, help="最多保留幾張卡（預設 50）")
    parser.add_argument("--no-slim", action="store_true", help="輸出原始完整 JSON（檔案會很大）")
    args = parser.parse_args()

    if args.insecure:
        os.environ["CTBC_INSECURE_SSL"] = "1"

    print("執行初始抓取...")
    fetch_credit_cards(limit=args.limit, slim=(not args.no_slim))

    if not args.daemon:
        print("✓ 單次抓取完成（未啟用排程器）")
        raise SystemExit(0)

    start_scheduler(limit=args.limit, slim=(not args.no_slim))
    print("按 Ctrl+C 停止排程器")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("排程器已停止")
        print("\n✓ 排程器已停止")
