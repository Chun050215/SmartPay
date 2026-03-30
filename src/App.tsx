import { useEffect, useMemo, useState } from 'react'
import './smartpay.css'
import uniopenCardImg from './assets/uniopen-card.png'

// 爬蟲數據類型定義
interface CreditCard {
  cardId: string
  cardName: string
  cardImg: string[]
  cardFeature: string[]
  cardFeatureHighlight: string[]
  issueGroup: string[]
  introLink: string
  applyLink: string
  starRate: number
  shortIntro: string
  [key: string]: any
}

interface CreditCardsData {
  creditCards: CreditCard[]
}

// ==================== 銀行配置 ====================
// 用於管理不同銀行的前綴和信息，便於日後擴展支持其他銀行
const BANK_CONFIG = {
  ctbc: {
    name: '中信銀行',
    prefix: 'https://www.ctbcbank.com'
  },
  // 未來可以擴展其他銀行
  // example: {
  //   name: '範例銀行',
  //   prefix: 'https://www.example.com'
  // }
} as const

type BankKey = keyof typeof BANK_CONFIG

/**
 * 根據銀行 key 和 URL 生成完整的 URL
 * 示例：ensureFullUrl('/content/...', 'ctbc') → 'https://www.ctbcbank.com/content/...'
 */
function ensureFullUrl(url: string | undefined, bank: BankKey = 'ctbc'): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const bankConfig = BANK_CONFIG[bank]
  return `${bankConfig.prefix}${url}`
}

// 動態導入爬蟲數據
let creditCardsDataCache: CreditCardsData | null = null

async function loadCreditCardsData(): Promise<CreditCardsData> {
  if (creditCardsDataCache) {
    return creditCardsDataCache
  }
  try {
    const response = await fetch('/credit_cards_data.json')
    creditCardsDataCache = await response.json()
    return creditCardsDataCache as CreditCardsData
  } catch (error) {
    console.error('載入信用卡數據失敗:', error)
    return { creditCards: [] }
  }
}

type TabId = 'home' | 'cards' | 'pay' | 'travel'

function Icon({ name }: { name: 'home' | 'card' | 'pay' | 'travel' }) {
  if (name === 'home') {
    return (
      <svg className="tab-icon tab-icon-home" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <g className="icon-base">
          <path d="M3 8l6-5 6 5v7a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M7 16v-5h4v5" stroke="currentColor" strokeWidth="1.3" />
        </g>
        <g className="icon-active">
          <path d="M3 8l6-5 6 5v7a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" fill="currentColor" opacity="0.18" />
          <path d="M6.7 16v-5h4.6v5" stroke="currentColor" strokeWidth="1.5" />
        </g>
      </svg>
    )
  }
  if (name === 'card') {
    return (
      <svg className="tab-icon tab-icon-card" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <g className="icon-base">
          <rect x="2" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M2 8h14" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <g className="icon-active">
          <rect x="2" y="5" width="14" height="10" rx="2.2" fill="currentColor" opacity="0.16" />
          <path d="M2 8h14" stroke="currentColor" strokeWidth="1.4" />
          <rect x="4.4" y="11.3" width="4.2" height="1.8" rx="0.9" fill="currentColor" />
        </g>
      </svg>
    )
  }
  if (name === 'pay') {
    return (
      <svg className="tab-icon tab-icon-pay" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <g className="icon-base">
          <rect x="3" y="3" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <rect x="9" y="3" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <rect x="3" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M11 11h4M13 9v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <g className="icon-active">
          <rect x="3" y="3" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.16" />
          <rect x="9" y="3" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.16" />
          <rect x="3" y="9" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.16" />
          <path d="M11 11h4M13 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    )
  }
  return (
    <svg className="tab-icon tab-icon-travel" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <g className="icon-base">
        <path d="M3 13l2.5-2.5 2 1.5 3-4.5 3 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M13 4l-1.5.8-.7-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="icon-active">
        <path d="M3 13l2.5-2.5 2 1.5 3-4.5 3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="13.5" cy="4.4" r="1.3" fill="currentColor" opacity="0.22" />
      </g>
    </svg>
  )
}

function ScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="scan-wrap on" role="dialog" aria-modal="true">
      <div className="scan-sheet">
        <div className="rbet" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-text-primary)' }}>中信 Everywhere 卡</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>本次預計回饋 5%・NT$45</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div className="qr-box" aria-label="QR code mock">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <rect x="4" y="4" width="22" height="22" rx="3" stroke="var(--g800)" strokeWidth="2" fill="none" />
            <rect x="34" y="4" width="22" height="22" rx="3" stroke="var(--g800)" strokeWidth="2" fill="none" />
            <rect x="4" y="34" width="22" height="22" rx="3" stroke="var(--g800)" strokeWidth="2" fill="none" />
            <rect x="9" y="9" width="12" height="12" rx="1.5" fill="var(--g600)" />
            <rect x="39" y="9" width="12" height="12" rx="1.5" fill="var(--g600)" />
            <rect x="9" y="39" width="12" height="12" rx="1.5" fill="var(--g600)" />
            <rect x="34" y="34" width="5" height="5" fill="var(--g800)" />
            <rect x="41" y="34" width="5" height="5" fill="var(--g800)" />
            <rect x="34" y="41" width="5" height="5" fill="var(--g800)" />
            <rect x="51" y="41" width="5" height="5" fill="var(--g800)" />
            <rect x="41" y="51" width="5" height="5" fill="var(--g800)" />
            <rect x="51" y="51" width="5" height="5" fill="var(--g800)" />
          </svg>
        </div>
        <div className="barlines"></div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-secondary)' }}>出示此條碼完成付款</div>
      </div>
      <button className="scan-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  )
}

function UserAvatar({ name = 'SmartPay 使用者' }: { name?: string }) {
  return (
    <button className="avatar-btn" type="button" aria-label={`使用者頭像：${name}`}>
      <div className="avatar" aria-hidden="true">
        <svg className="avatar-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3.2" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" />
          <path
            d="M3.5 17c0-3.1 2.9-5.6 6.5-5.6s6.5 2.5 6.5 5.6"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </button>
  )
}

type UserCardType = '一般回饋' | '旅遊/海外' | '哩程' | '現金回饋' | '學生/入門'
type PayMode = 'proactive' | 'scan'
type PayPriority = 'points' | 'miles' | 'cashback'
type UserCard = {
  id: string
  name: string
  issuer: 'ctbc' | 'other'
  bank: BankKey  // 銀行 key，用於確定 URL 前綴
  type: UserCardType
  masked: string
  note: string
  priority: number
  tags: string[]
  monthlyReward: number
  usageCount: number
  categorySplit: { dining: number; travel: number; daily: number }
  badgeText?: string
  badgeStyle?: { [key: string]: string }
  chipBg: string
  goRate: string
  goReminder: string
  rules: {
    general: string[]
    overseas: string[]
    ecommerce: string[]
  }
  sourceUrl: string
  // 爬蟲數據字段
  cardId?: string
  cardName?: string
  cardImg?: string[]
  cardFeature?: string[]
  introLink?: string
}

function AddCardModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (card: { name: string; type: UserCardType; cardNumber: string; cardId?: string; cardName?: string }) => void
}) {
  const [name, setName] = useState('新信用卡')
  const [type, setType] = useState<UserCardType>('一般回饋')
  const [cardNumber, setCardNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [creditCardsData, setCreditCardsData] = useState<CreditCardsData>({ creditCards: [] })
  const [cardSearchQuery, setCardSearchQuery] = useState('')
  const [showCardDropdown, setShowCardDropdown] = useState(false)

  // 載入爬蟲數據
  useEffect(() => {
    if (!open) return
    loadCreditCardsData().then(setCreditCardsData)
  }, [open])

  useEffect(() => {
    if (!open) return
    setError(null)
    setName('新信用卡')
    setType('一般回饋')
    setCardNumber('')
    setSelectedCardId(null)
    setCardSearchQuery('')
    setShowCardDropdown(false)
  }, [open])

  if (!open) return null

  const digits = cardNumber.replace(/\D/g, '')
  const canSave = (digits.length >= 12 && name.trim().length > 0) || selectedCardId

  // 當選擇爬蟲數據中的卡片時，自動填充資料
  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId)
    const card = creditCardsData.creditCards.find(c => c.cardId === cardId)
    if (card) {
      setName(card.cardName)
    }
  }

  return (
    <div className="modal-wrap on" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="rbet" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>新增信用卡</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>設定卡號與卡片類型</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* 快速選擇中信卡片 - 搜索下拉菜單 */}
        {creditCardsData.creditCards.length > 0 ? (
          <div className="sp-field" style={{ position: 'relative' }}>
            <label className="sp-label" htmlFor="cardSearch">選擇中信卡片（可選）</label>
            <input
              id="cardSearch"
              className="sp-input"
              type="text"
              placeholder="搜尋卡片名稱或發卡組織..."
              value={cardSearchQuery}
              onChange={(e) => {
                setCardSearchQuery(e.target.value)
                setShowCardDropdown(true)
              }}
              onFocus={() => setShowCardDropdown(true)}
              style={{
                position: 'relative',
                zIndex: showCardDropdown ? 10 : 1
              }}
            />
            
            {/* 下拉選擇菜單 */}
            {showCardDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  maxHeight: 300,
                  overflowY: 'auto',
                  zIndex: 100,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                }}
              >
                {creditCardsData.creditCards
                  .filter(card =>
                    card.cardName.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
                    card.issueGroup.some(group =>
                      group.toLowerCase().includes(cardSearchQuery.toLowerCase())
                    )
                  )
                  .map(card => (
                    <div
                      key={card.cardId}
                      onClick={() => {
                        handleSelectCard(card.cardId)
                        setCardSearchQuery(card.cardName)
                        setShowCardDropdown(false)
                      }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        background: selectedCardId === card.cardId ? 'var(--g50)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCardId !== card.cardId) {
                          e.currentTarget.style.background = 'var(--color-background-secondary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCardId !== card.cardId) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{card.cardName}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        發卡組織: {card.issueGroup.join('、')}
                      </div>
                    </div>
                  ))}
                {cardSearchQuery && creditCardsData.creditCards.filter(card =>
                  card.cardName.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
                  card.issueGroup.some(group =>
                    group.toLowerCase().includes(cardSearchQuery.toLowerCase())
                  )
                ).length === 0 && (
                  <div
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 12
                    }}
                  >
                    找不到符合「{cardSearchQuery}」的卡片
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <div className="sp-field" style={{ marginTop: 10 }}>
          <label className="sp-label" htmlFor="cardName">卡片名稱</label>
          <input
            id="cardName"
            className="sp-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：中信 @GOGO 卡"
          />
        </div>

        <div className="sp-field" style={{ marginTop: 10 }}>
          <label className="sp-label" htmlFor="cardType">卡片類型</label>
          <select id="cardType" className="sp-select" value={type} onChange={(e) => setType(e.target.value as UserCardType)}>
            <option value="一般回饋">一般回饋</option>
            <option value="旅遊/海外">旅遊/海外</option>
            <option value="哩程">哩程</option>
            <option value="現金回饋">現金回饋</option>
            <option value="學生/入門">學生/入門</option>
          </select>
        </div>

        <div className="sp-field" style={{ marginTop: 10 }}>
          <label className="sp-label" htmlFor="cardNo">卡號</label>
          <input
            id="cardNo"
            className="sp-input"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="例如：4111 1111 1111 1111"
            inputMode="numeric"
            autoComplete="cc-number"
          />
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 6 }}>
            會以遮罩方式顯示（只保留末四碼）。
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 10, fontSize: 12, color: '#B42318' }}>{error}</div>
        ) : null}

        <div className="modal-actions">
          <button className="modal-btn secondary" type="button" onClick={onClose}>取消</button>
          <button
            className="modal-btn primary"
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (selectedCardId) {
                const card = creditCardsData.creditCards.find(c => c.cardId === selectedCardId)
                if (card) {
                  onSave({
                    name: card.cardName,
                    type,
                    cardNumber: digits || '0000000000000000',
                    cardId: card.cardId,
                    cardName: card.cardName
                  })
                  onClose()
                }
                return
              }

              if (!canSave) {
                setError('請輸入至少 12 碼卡號或選擇中信卡片')
                return
              }
              onSave({ name: name.trim() || '新信用卡', type, cardNumber: digits })
              onClose()
            }}
          >
            儲存
          </button>
        </div>
      </div>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [scanOpen, setScanOpen] = useState(false)
  const [travelCountry, setTravelCountry] = useState<string>('日本')
  const [travelQuery, setTravelQuery] = useState<string>('')
  const [now, setNow] = useState(() => new Date())
  const [geo, setGeo] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; lat: number; lng: number; accuracyM?: number; ts: number }
    | { status: 'error'; message: string }
  >({
    // Demo default: show “GPS 已啟動/已定位” without needing permission click.
    status: 'ready',
    lat: 25.033,
    lng: 121.5654,
    accuracyM: 18,
    ts: Date.now(),
  })

  const [addCardOpen, setAddCardOpen] = useState(false)
  const [rewardDetailOpen, setRewardDetailOpen] = useState(false)
  const [cardDetailId, setCardDetailId] = useState<string | null>(null)
  const [ruleTab, setRuleTab] = useState<'general' | 'overseas' | 'ecommerce'>('general')
  const [payMode, setPayMode] = useState<PayMode>('proactive')
  const [payPriority, setPayPriority] = useState<PayPriority>('cashback')
  const [merchantId, setMerchantId] = useState('PXMART-001')
  const [userCards, setUserCards] = useState<UserCard[]>(() => [])

  const getBestPercent = (texts: string[]): string | null => {
    const joined = texts.join(' ')
    const matches = joined.match(/(\d+(?:\.\d+)?)\s*%/g) || []
    let best = -1
    for (const m of matches) {
      const n = Number(m.replace('%', '').trim())
      if (!Number.isNaN(n)) best = Math.max(best, n)
    }
    return best > 0 ? `${best}%` : null
  }

  const mapCtbcCrawlerCardToUserCard = (cc: CreditCard, index: number): UserCard => {
    const rewardTypes: string[] = Array.isArray((cc as any).rewardType) ? (cc as any).rewardType : []
    const cardTypes: string[] = Array.isArray((cc as any).cardType) ? (cc as any).cardType : []
    const shortIntro = typeof (cc as any).shortIntro === 'string' ? (cc as any).shortIntro : ''
    const featureHighlight: string[] = Array.isArray((cc as any).cardFeatureHighlight) ? (cc as any).cardFeatureHighlight : []
    const feature: string[] = Array.isArray((cc as any).cardFeature) ? (cc as any).cardFeature : []

    const isOverseas = rewardTypes.includes('國外消費') || rewardTypes.includes('海外旅遊')
    const isEcom = rewardTypes.includes('網路購物') || rewardTypes.includes('外送平台')
    const type: UserCardType = isOverseas ? '旅遊/海外' : '一般回饋'

    const goRate = getBestPercent([...featureHighlight, ...feature, shortIntro].filter(Boolean)) ?? '依活動'
    const goReminder =
      featureHighlight[0] ||
      (shortIntro ? `重點：${shortIntro}` : '') ||
      '請留意是否需登錄、限額、單筆門檻（以原文為準）'

    const generalRules = (featureHighlight.length ? featureHighlight : feature).slice(0, 3)
    const overseasRules = isOverseas
      ? ['海外/國外回饋請留意手續費、幣別、活動登錄與上限', ...feature.slice(0, 2)].filter(Boolean)
      : ['此卡以一般消費回饋為主，海外規則以原文為準']
    const ecommerceRules = isEcom
      ? ['網購/外送回饋依平台與月份公告可能不同', ...feature.slice(0, 2)].filter(Boolean)
      : ['此卡未主打網購/外送加碼，詳見原文']

    const tags = [
      rewardTypes.includes('餐飲美食') ? '餐廳' : null,
      isOverseas ? '旅遊' : null,
      rewardTypes.includes('生活量販') ? '生活量販' : null,
      '日常購物',
    ].filter(Boolean) as string[]

    const badge =
      type === '旅遊/海外'
        ? { text: '旅遊', style: { background: '#E8EEFF', color: '#1A3080' } }
        : { text: '中信', style: { background: 'var(--g50)', color: 'var(--g800)' } }

    const intro = ensureFullUrl((cc as any).introLink, 'ctbc')
    const apply = ensureFullUrl((cc as any).applyLink, 'ctbc')

    return {
      id: String((cc as any).cardId || `ctbc-${index}`),
      name: String((cc as any).cardName || '中信信用卡'),
      issuer: 'ctbc',
      bank: 'ctbc',
      type,
      masked: '官方卡片',
      note: shortIntro || [...cardTypes, ...rewardTypes].slice(0, 3).join('／') || '中信卡片（爬蟲資料）',
      priority: index + 1,
      tags,
      monthlyReward: 0,
      usageCount: 0,
      categorySplit: { dining: rewardTypes.includes('餐飲美食') ? 40 : 15, travel: isOverseas ? 60 : 10, daily: 40 },
      badgeText: badge.text,
      badgeStyle: badge.style,
      chipBg: 'var(--g800)',
      goRate,
      goReminder,
      rules: {
        general: generalRules.length ? generalRules : ['一般消費回饋以原文公告為準'],
        overseas: overseasRules,
        ecommerce: ecommerceRules,
      },
      sourceUrl: intro || apply || 'https://www.ctbcbank.com/twrbo/zh_tw/cc_index/cc_product/cc_hot.html',
      // 爬蟲數據字段（用於圖片/原文）
      cardId: (cc as any).cardId,
      cardName: (cc as any).cardName,
      cardImg: Array.isArray((cc as any).cardImg) ? (cc as any).cardImg : [],
      cardFeature: Array.isArray((cc as any).cardFeature) ? (cc as any).cardFeature : [],
      introLink: (cc as any).introLink,
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000 * 30)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let alive = true
    loadCreditCardsData().then((data) => {
      if (!alive) return
      const ctbc = (data.creditCards || []).slice(0, 10).map(mapCtbcCrawlerCardToUserCard)
      setUserCards((prev) => {
        const keepUser = prev.filter((c) => String(c.id).startsWith('user-'))
        const merged = [...ctbc, ...keepUser]
        return merged.map((c, i) => ({ ...c, priority: i + 1 }))
      })
    })
    return () => {
      alive = false
    }
  }, [])

  const timeText = useMemo(() => {
    // iPhone status bar style: "9:41"
    return now.toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: false })
  }, [now])

  const requestGps = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: '此瀏覽器不支援定位' })
      return
    }
    setGeo({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: 'ready',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          ts: pos.timestamp || Date.now(),
        })
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? '定位權限被拒絕'
            : err.code === err.POSITION_UNAVAILABLE
              ? '目前無法取得定位'
              : err.code === err.TIMEOUT
                ? '定位逾時'
                : '定位失敗'
        setGeo({ status: 'error', message: msg })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    )
  }

  const countries = useMemo(
    () => ['日本', '韓國', '新加坡', '泰國', '越南', '美國', '加拿大', '英國', '法國', '德國', '西班牙', '義大利', '澳洲'],
    [],
  )
  const scenarioTags = ['餐廳', '旅遊', '日常購物', '生活量販']

  const updateCardPriority = (id: string, priority: number) => {
    setUserCards((prev) => prev.map((c) => (c.id === id ? { ...c, priority } : c)))
  }

  const toggleCardTag = (id: string, tag: string) => {
    setUserCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const exists = c.tags.includes(tag)
        return { ...c, tags: exists ? c.tags.filter((t) => t !== tag) : [...c.tags, tag] }
      }),
    )
  }

  const q = travelQuery.trim().toLowerCase()
  const matchesQuery = (text: string) => (q.length === 0 ? true : text.toLowerCase().includes(q))
  const selectedCard = useMemo(
    () => (cardDetailId ? userCards.find((c) => c.id === cardDetailId) ?? null : null),
    [cardDetailId, userCards],
  )

  const travelInsight = useMemo(() => {
    const destination = travelCountry
    const isJapan = destination === '日本'
    const isWest = ['美國', '加拿大', '英國', '法國', '德國', '西班牙', '義大利'].includes(destination)
    const recommendation = isJapan
      ? {
          title: '日本偏現金場景',
          action: '優先推薦海外手續費最低卡，並預留換匯現金。',
          bestCard: '中信 @GOGO 卡（海外手續費較低 + 海外 5%）',
        }
      : isWest
        ? {
            title: '歐美刷卡主場景',
            action: '優先推薦整體回饋率最高卡，減少現金攜帶。',
            bestCard: '中信 Everywhere 卡（綜合回饋與通路適配）',
          }
        : {
            title: `${destination} 混合支付場景`,
            action: '以回饋率與手續費平衡，建議一主一卡備援。',
            bestCard: '中信 Everywhere 卡（主）＋中信 @GOGO 卡（備）',
          }

    const notices = [
      {
        bank: '中信 Everywhere',
        raw: '海外加碼活動需先登錄，名額限 5,000，單月回饋上限 NT$1,200。',
        plain: '先去活動頁完成登錄，避免刷了拿不到加碼；本月最高回饋抓 NT$1,200。',
      },
      {
        bank: '中信 @GOGO',
        raw: '指定幣別享額外回饋，需達門檻消費 NT$6,000。',
        plain: '集中到同一卡刷滿 NT$6,000 再結帳，才會觸發額外回饋。',
      },
      {
        bank: 'A 銀行卡',
        raw: '滿額贈需當月海外累積達 NT$20,000，隔月回饋入帳。',
        plain: '若你本趟預算不到 NT$20,000，這張卡的滿額贈可以先不追。',
      },
    ]

    const timeline = [
      { day: '出發前 7 天', task: '確認主力卡/備援卡海外交易功能已開啟' },
      { day: '出發前 3 天', task: '完成加碼活動登錄，檢查名額是否已滿' },
      { day: '出發前 2 天', task: `依 ${destination} 支付習慣設定換匯目標金額（建議 NT$10,000~20,000）` },
      { day: '出發前 1 天', task: '設定交易推播與單筆上限，避免盜刷風險' },
    ]

    return { recommendation, notices, timeline, isJapan, isWest }
  }, [travelCountry])

  const merchantProfile = useMemo(() => {
    const id = merchantId.trim().toUpperCase()
    if (id.includes('PX') || id.includes('MART')) {
      return { name: '全聯福利中心', channel: '生活量販', distanceM: 180 }
    }
    if (id.includes('UNI') || id.includes('OPEN')) {
      return { name: '7-ELEVEN', channel: '統一通路', distanceM: 120 }
    }
    if (id.includes('COF') || id.includes('CAFE')) {
      return { name: '連鎖咖啡店', channel: '餐飲美食', distanceM: 90 }
    }
    return { name: '一般合作商家', channel: '一般消費', distanceM: 240 }
  }, [merchantId])

  const isInsideGeofence = merchantProfile.distanceM <= 200
  const proactiveMessage =
    payPriority === 'points'
      ? `即將抵達${merchantProfile.name}，今天使用中信 Everywhere 卡可得 3X 點數，比隨機刷多賺 NT$45！`
      : payPriority === 'miles'
        ? `即將抵達${merchantProfile.name}，今天使用中信 Everywhere 卡可加速累積里程，比隨機刷多賺 1.5X！`
        : `即將抵達${merchantProfile.name}，今天使用中信 Everywhere 卡可得 5% 現金回饋，比隨機刷多賺 NT$45！`

  const payRecommendation = useMemo(() => {
    if (payPriority === 'points') {
      return { card: '中信 Everywhere 卡', rewardText: '3X 點數', estimateText: 'NT$45 等值', percent: '3X' }
    }
    if (payPriority === 'miles') {
      return { card: '中信 Everywhere 卡', rewardText: '1.5X 里程累積', estimateText: '約 68 哩', percent: '1.5X' }
    }
    return { card: '中信 Everywhere 卡', rewardText: '5% 現金回饋', estimateText: 'NT$45', percent: '5%' }
  }, [payPriority])

  const screens = useMemo(() => {
    return {
      home: (
        <div className="screen on" id="s-home">
          <div className="topbar">
            <div className="rbet">
              <div>
                <div className="topbar-title">智慧刷卡顧問</div>
                <div className="topbar-sub">本月已優化回饋 NT$380</div>
              </div>
              <UserAvatar name="王小明" />
            </div>
          </div>
          <div className="body">
            <div className="push-card">
              <div className="push-label">
                <span>即時推播</span>
                <span className="bell-wrap" aria-label="有新推播">
                  <svg className="bell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 22a2.3 2.3 0 0 0 2.2-2H9.8A2.3 2.3 0 0 0 12 22Z"
                      fill="rgba(255,255,255,0.92)"
                    />
                    <path
                      d="M19 17H5c1.2-1.1 2-2.3 2-4.2V10a5 5 0 0 1 10 0v2.8c0 1.9.8 3.1 2 4.2Z"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="bell-dot" aria-hidden="true" />
                </span>
              </div>
              <div className="push-body">{proactiveMessage}</div>
              <div className="push-sync">
                <div className="push-sync-item">
                  <span>優先策略</span>
                  <strong>
                    {payPriority === 'points'
                      ? '優先折抵點數'
                      : payPriority === 'miles'
                        ? '優先累積里程'
                        : '優先現金回饋'}
                  </strong>
                </div>
                <div className="push-sync-item">
                  <span>地理圍欄</span>
                  <strong>{isInsideGeofence ? `已進入 ${merchantProfile.distanceM}m 觸發範圍` : `${merchantProfile.distanceM}m（尚未觸發）`}</strong>
                </div>
                <div className="push-sync-item">
                  <span>抵達倒數</span>
                  <strong>{isInsideGeofence ? '約 2 分鐘' : '約 4 分鐘'}</strong>
                </div>
                <div className="push-sync-item">
                  <span>通路預測</span>
                  <strong>{merchantProfile.name}／{merchantProfile.channel}</strong>
                </div>
              </div>
              <div className="gps-row">
                <div className="gps-left">
                  <span className={`gps-dot ${geo.status === 'ready' ? 'on' : geo.status === 'loading' ? 'loading' : ''}`} />
                  {geo.status === 'ready' ? (
                    <span>
                      GPS 已定位（{geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                      {typeof geo.accuracyM === 'number' ? `・±${Math.round(geo.accuracyM)}m` : ''}）
                    </span>
                  ) : geo.status === 'loading' ? (
                    <span>GPS 定位中…</span>
                  ) : geo.status === 'error' ? (
                    <span>GPS：{geo.message}</span>
                  ) : (
                    <span>GPS：未啟用</span>
                  )}
                </div>
                <button className="gps-btn" onClick={requestGps} type="button">
                  {geo.status === 'ready' ? '重新定位' : '啟用定位'}
                </button>
              </div>
              <button
                className="push-btn"
                onClick={() => {
                  setTab('pay')
                  setScanOpen(true)
                }}
              >
                開啟條碼付款 →
              </button>
            </div>

            <div className="card">
              <div className="clabel">SmartPay 今日最佳化摘要</div>
              <div className="home-kpi-grid">
                <div className="home-kpi-item">
                  <div className="home-kpi-value">+NT$45</div>
                  <div className="home-kpi-label">本次最優支付預估多賺</div>
                </div>
                <div className="home-kpi-item">
                  <div className="home-kpi-value">3 項</div>
                  <div className="home-kpi-label">待完成行前提醒</div>
                </div>
                <div className="home-kpi-item">
                  <div className="home-kpi-value">4 張</div>
                  <div className="home-kpi-label">已同步管理卡片</div>
                </div>
              </div>
              <div className="home-cta-row">
                <button className="quick-btn" onClick={() => setTab('pay')}>立即執行最優支付</button>
                <button className="quick-btn" onClick={() => setTab('cards')}>前往卡片中心</button>
              </div>
            </div>

            <div className="card">
              <div className="clabel-row">
                <div className="clabel" style={{ marginBottom: 0 }}>本月回饋總覽</div>
                <button className="link-btn" type="button" onClick={() => setRewardDetailOpen(true)}>
                  查看詳細資訊
                </button>
              </div>
              <div className="row">
                <div className="met"><div className="met-v">$1,247</div><div className="met-l">已獲回饋</div></div>
                <div className="met"><div className="met-v">$380</div><div className="met-l">聰明選卡多賺</div></div>
                <div className="met"><div className="met-v">4</div><div className="met-l">持有卡片</div></div>
              </div>
            </div>
            <div className="card">
              <div className="clabel">快速功能</div>
              <div className="row">
                <button onClick={() => setTab('cards')} className="quick-btn">我的卡片</button>
                <button onClick={() => setTab('pay')} className="quick-btn">即時支付</button>
                <button onClick={() => setTab('travel')} className="quick-btn">出國規劃</button>
              </div>
            </div>
            <div className="card">
              <div className="clabel">待辦提醒</div>
              <div className="alert-row"><div className="dot" style={{ background: '#E24B4A' }}></div><span>中信 Everywhere 限時活動 <span style={{ color: '#A32D2D' }}>3 天後截止登錄</span></span></div>
              <div className="div" style={{ margin: '4px 0' }}></div>
              <div className="alert-row"><div className="dot" style={{ background: '#E6A817' }}></div><span>航空哩程點數 <span style={{ color: '#7A5200' }}>本月到期 2,400 點</span></span></div>
            </div>
          </div>
        </div>
      ),
      cards: (
        <div className="screen on" id="s-cards">
          <div className="topbar">
            <div className="rbet">
              <div>
                <div className="topbar-title">我的卡片中心</div>
                <div className="topbar-sub">管理卡片・回饋儀表板・AI 推薦</div>
              </div>
              <UserAvatar name="王小明" />
            </div>
          </div>
          <div className="body">
            <div className="card">
              <div className="clabel-row">
                <div className="clabel" style={{ marginBottom: 0 }}>持有卡片</div>
                <button className="add-btn" type="button" onClick={() => setAddCardOpen(true)} aria-label="新增卡片">＋</button>
              </div>
              <div className="card-manage-tip">已整合中信與他行卡片，優惠規則會自動同步更新（示意）。</div>
              {userCards
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((c) => (
                  <div key={c.id} className="cc-manage-item">
                    <div className="cc-item" style={{ background: 'var(--color-background-secondary)', marginBottom: 0 }}>
                    <button className="cc-item-hit" type="button" onClick={() => { setCardDetailId(c.id); setRuleTab('general') }} aria-label={`查看 ${c.name} 詳細規則`} />
                      {c.cardImg && c.cardImg.length > 0 ? (
                        <img
                          src={ensureFullUrl(c.cardImg[0], c.bank || 'ctbc')}
                          alt={`${c.name} 卡片`}
                          style={{
                            width: 56,
                            height: 36,
                            borderRadius: 4,
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div className="cc-chip" style={{ background: c.chipBg }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cc-name">{c.name}</div>
                        <div className="cc-sub">{c.note} ・ {c.masked}</div>
                      </div>
                      <span className="badge" style={c.issuer === 'ctbc' ? { background: 'var(--g50)', color: 'var(--g800)' } : { background: 'var(--color-background-tertiary)', color: 'var(--color-text-secondary)' }}>
                        {c.issuer === 'ctbc' ? '中信' : '他行'}
                      </span>
                    </div>
                    <div className="cc-controls">
                      <label className="sp-label" style={{ marginBottom: 0 }}>
                        優先順序
                        <select
                          className="sp-select cc-priority"
                          value={String(c.priority)}
                          onChange={(e) => updateCardPriority(c.id, Number(e.target.value))}
                        >
                          {Array.from({ length: userCards.length }).map((_, i) => (
                            <option key={`${c.id}-${i + 1}`} value={String(i + 1)}>#{i + 1}</option>
                          ))}
                        </select>
                      </label>
                      <div className="cc-tag-wrap">
                        {scenarioTags.map((tag) => (
                          <button
                            key={`${c.id}-${tag}`}
                            type="button"
                            className={`cc-tag ${c.tags.includes(tag) ? 'on' : ''}`}
                            onClick={() => toggleCardTag(c.id, tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="card">
              <div className="clabel">回饋儀表板・本月</div>
              <div className="dashboard-grid">
                {userCards.map((c) => (
                  <div key={`kpi-${c.id}`} className="dashboard-item">
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-sub">本月回饋 NT${c.monthlyReward}・使用 {c.usageCount} 次</div>
                    <div className="mini-split">
                      <span>餐飲 {c.categorySplit.dining}%</span>
                      <span>旅遊 {c.categorySplit.travel}%</span>
                      <span>日常 {c.categorySplit.daily}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="warn-bar" style={{ marginTop: 10 }}>
                跨卡比較：若每次都用最優卡，本月可多賺 <strong style={{ color: '#7A5200' }}>NT$380</strong>
              </div>
              <div className="clabel" style={{ marginTop: 10, marginBottom: 6 }}>年度累積（示意）</div>
              <div className="year-bars">
                <div className="year-bar"><span>Q1</span><div className="prog"><div className="progb" style={{ width: '62%' }} /></div><strong>NT$2,540</strong></div>
                <div className="year-bar"><span>Q2</span><div className="prog"><div className="progb" style={{ width: '48%', background: 'var(--g400)' }} /></div><strong>NT$1,980</strong></div>
                <div className="year-bar"><span>Q3</span><div className="prog"><div className="progb" style={{ width: '36%', background: 'rgba(11,42,74,0.38)' }} /></div><strong>NT$1,420</strong></div>
              </div>
            </div>
            <div className="card">
              <div className="clabel">即將到期提醒</div>
              <div className="reminder-list">
                <div className="reminder-item">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>航空里程點數（30 天內）</div>
                    <div className="cc-sub">建議優先兌換機票、里程升等等快速使用方式</div>
                  </div>
                  <div className="reminder-cta">2,400 點</div>
                </div>
                <div className="reminder-item">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>限時活動登錄截止</div>
                    <div className="cc-sub">中信卡友回饋活動 3 天後截止，避免漏登錄</div>
                  </div>
                  <div className="reminder-cta">剩 3 天</div>
                </div>
                <div className="reminder-item">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>滿額禮進度追蹤</div>
                    <div className="cc-sub">距離本季滿額禮還差 NT$2,300，可從量販/餐飲優先刷</div>
                  </div>
                  <div className="reminder-cta">差 NT$2,300</div>
                </div>
              </div>
            </div>
            <div className="ai-box">
              <div className="ai-tag">AI 智慧推薦</div>
              <div className="ai-head">
                <img className="ai-card-img" src={uniopenCardImg} alt="中信 Everywhere 卡推薦" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ai-title">中信 Everywhere 卡</div>
                  <div className="ai-sub">優先顯示中信卡，並提供可量化的年度增益試算</div>
                </div>
              </div>
              <div className="ai-body">
                根據你過去 6 個月的消費習慣，你在「餐廳」類別月均消費 NT$4,200，但目前使用卡片此類別僅有 1% 回饋。申辦中信 Everywhere 卡後，餐廳回饋率可達 5%，每年預計多賺 <strong style={{ color: 'var(--g800)' }}>NT$2,520</strong>。
              </div>
              <button
                className="abtn"
                type="button"
                onClick={() => {
                  window.open(
                    'https://www.ctbcbank.com/twrbo/zh_tw/cc_index/cc_product/cc_hot.html',
                    '_blank',
                    'noopener,noreferrer',
                  )
                }}
              >
                立即申辦中信uniopen聯名卡 →
              </button>
            </div>
          </div>
        </div>
      ),
      pay: (
        <div className="screen on" id="s-pay">
          <div className="topbar">
            <div className="topbar-title">即時最優支付</div>
            <div className="topbar-sub">推播 + 掃碼・共用同一 AI 引擎</div>
          </div>
          <div className="body">
            <div className="card">
              <div className="clabel">運作模式</div>
              <div className="pay-mode-tabs">
                <button
                  type="button"
                  className={`pay-mode-btn ${payMode === 'proactive' ? 'on' : ''}`}
                  onClick={() => setPayMode('proactive')}
                >
                  模式一：主動推播
                </button>
                <button
                  type="button"
                  className={`pay-mode-btn ${payMode === 'scan' ? 'on' : ''}`}
                  onClick={() => setPayMode('scan')}
                >
                  模式二：現場掃碼
                </button>
              </div>
            </div>

            {payMode === 'proactive' ? (
              <div className="card">
                <div className="clabel">消費前推播設定</div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="prioritySelect">優先策略</label>
                  <select
                    id="prioritySelect"
                    className="sp-select"
                    value={payPriority}
                    onChange={(e) => setPayPriority(e.target.value as PayPriority)}
                  >
                    <option value="points">優先折抵點數</option>
                    <option value="miles">優先累積里程</option>
                    <option value="cashback">優先現金回饋</option>
                  </select>
                </div>
                <div className="pay-status-list">
                  <div className="pay-status-item">
                    <span>地理圍欄</span>
                    <strong>{isInsideGeofence ? `已進入 ${merchantProfile.distanceM}m 觸發範圍` : `${merchantProfile.distanceM}m（尚未觸發）`}</strong>
                  </div>
                  <div className="pay-status-item">
                    <span>抵達倒數</span>
                    <strong>{isInsideGeofence ? '約 2 分鐘' : '約 4 分鐘'}</strong>
                  </div>
                  <div className="pay-status-item">
                    <span>通路預測</span>
                    <strong>{merchantProfile.name}／{merchantProfile.channel}</strong>
                  </div>
                </div>
                <div className="info-bar" style={{ marginTop: 10 }}>{proactiveMessage}</div>
              </div>
            ) : (
              <div className="card">
                <div className="clabel">現場掃碼辨識</div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="merchantIdInput">Merchant ID（掃碼結果）</label>
                  <input
                    id="merchantIdInput"
                    className="sp-input"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder="例如：PXMART-001"
                  />
                </div>
                <div className="pay-status-list" style={{ marginTop: 10 }}>
                  <div className="pay-status-item">
                    <span>GPS 定位</span>
                    <strong>{geo.status === 'ready' ? `已定位（${geo.lat.toFixed(3)}, ${geo.lng.toFixed(3)}）` : '未定位'}</strong>
                  </div>
                  <div className="pay-status-item">
                    <span>Merchant ID</span>
                    <strong>{merchantId || '未輸入'}</strong>
                  </div>
                  <div className="pay-status-item">
                    <span>雙重辨識結果</span>
                    <strong>{merchantProfile.name}／{merchantProfile.channel}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="rec-card">
              <div className="rbet" style={{ marginBottom: 10 }}>
                <div>
                  <div className="rec-name">{payRecommendation.card}</div>
                  <div className="rec-sub">
                    {payMode === 'scan'
                      ? `GPS + Merchant ID 雙重辨識・${merchantProfile.name}`
                      : `根據位置自動推薦・${merchantProfile.name}`}
                  </div>
                </div>
                <span className="badge bg">最優</span>
              </div>
              <div className="rbet">
                <div><div className="rec-rate">{payRecommendation.percent}</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{payRecommendation.rewardText}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>預計可得</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--g800)' }}>{payRecommendation.estimateText}</div>
                </div>
              </div>
              <div className="div"></div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                {payMode === 'scan'
                  ? `掃碼前即時建議：本次建議使用【${payRecommendation.card}】`
                  : '本月加碼活動進行中・已完成活動登錄'}
              </div>
              <div className="warn-bar" style={{ marginTop: 10 }}>
                關鍵提醒：{selectedCard?.goReminder ?? '需單筆滿 NT$888 才可套用當期活動加碼'}
              </div>
            </div>
            <div className="qbtn-wrap">
              <div className="qbtn" onClick={() => setScanOpen(true)}>
                <div style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.9)' }} />
                <div className="qbtn-text">點擊出示條碼</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>以推薦卡自動付款</div>
            </div>
            <button className="abtn" type="button" style={{ marginTop: 0 }}>
              一鍵確認付款
            </button>
            <div className="card">
              <div className="clabel">手動切換卡片</div>
              {userCards.map((card) => (
                <div key={card.id} className="sw-row">
                  <div className="sw-left">
                    {card.cardImg && card.cardImg.length > 0 ? (
                      <img
                        src={ensureFullUrl(card.cardImg[0], card.bank || 'ctbc')}
                        alt={`${card.name} 卡片`}
                        style={{
                          width: 44,
                          height: 28,
                          borderRadius: 4,
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div className="card-thumb" aria-hidden="true">
                        <div className="card-chip" style={{ background: card.chipBg }} />
                        <div className="card-brand" />
                      </div>
                    )}
                    <div style={{ fontSize: 13 }}>{card.name}</div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontSize: 13, color: card.issuer === 'ctbc' ? 'var(--g700)' : 'var(--color-text-secondary)' }}>
                      {card.goRate}
                    </span>
                    <span 
                      className="badge" 
                      style={{ 
                        background: card.issuer === 'ctbc' ? 'var(--g50)' : 'var(--color-background-secondary)',
                        color: card.issuer === 'ctbc' ? 'var(--g800)' : 'var(--color-text-secondary)',
                        cursor: 'pointer' 
                      }}
                    >
                      切換
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="info-bar">主動推播已開啟：導航時系統將在抵達前 2 分鐘自動推送最優刷卡建議。</div>
          </div>
        </div>
      ),
      travel: (
        <div className="screen on" id="s-travel">
          <div className="topbar">
            <div className="topbar-title">出國懶人包</div>
            <div className="topbar-sub">目的地：{travelCountry}・出發 5 天後</div>
          </div>
          <div className="body">
            <div className="card">
              <div className="clabel">搜尋目的地</div>
              <div className="sp-field">
                <label className="sp-label" htmlFor="countrySelect">國家/地區</label>
                <select
                  id="countrySelect"
                  className="sp-select"
                  value={travelCountry}
                  onChange={(e) => setTravelCountry(e.target.value)}
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="sp-field" style={{ marginTop: 10 }}>
                <label className="sp-label" htmlFor="travelSearch">搜尋（卡片/狀態/提醒）</label>
                <input
                  id="travelSearch"
                  className="sp-input"
                  value={travelQuery}
                  onChange={(e) => setTravelQuery(e.target.value)}
                  placeholder="例如：免手續費、5%、登錄、到期"
                />
              </div>
              {q.length > 0 ? (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  已套用搜尋：<span style={{ color: 'var(--g800)', fontWeight: 600 }}>{travelQuery}</span>
                </div>
              ) : null}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="ctable">
                <thead>
                  <tr>
                    <th style={{ width: '27%' }}>卡片</th>
                    <th style={{ width: '16%' }}>海外手續費</th>
                    <th style={{ width: '18%' }}>幣別轉換優惠</th>
                    <th style={{ width: '16%' }}>實體店加碼</th>
                    <th style={{ width: '23%' }}>行動提醒</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [
                      {
                        key: 'everywhere',
                        className: 'best',
                        card: <>中信 Everywhere<br /><span className="ltag">本月限時加碼</span></>,
                        fee: '免收',
                        fx: '指定幣別減碼',
                        bonus: '3%+1%',
                        status: <span style={{ color: 'var(--g800)', fontWeight: 500 }}>先登錄活動再刷 ✓</span>,
                        haystack: '中信 Everywhere 本月限時加碼 免收 幣別減碼 實體店 3%+1% 需登錄',
                      },
                      {
                        key: 'gogo',
                        className: 'apply',
                        card: <>中信 @GOGO<br /><span className="atag">申辦即享優惠</span></>,
                        fee: '0.5% 起',
                        fx: '海外通路加碼',
                        bonus: '5%',
                        status: <span className="alink">刷滿 NT$6,000 觸發 →</span>,
                        haystack: '中信 @GOGO 申辦即享優惠 0.5% 海外通路加碼 5% 門檻 6000',
                      },
                      {
                        key: 'a',
                        className: '',
                        card: 'A 銀行卡',
                        fee: '1.5%',
                        fx: '一般匯率',
                        bonus: '2%',
                        status: <span style={{ color: 'var(--color-text-secondary)' }}>滿額 NT$20,000 才有贈禮</span>,
                        haystack: 'A 銀行卡 1.5% 一般匯率 2% 滿額 20000',
                      },
                      {
                        key: 'b',
                        className: '',
                        card: 'B 銀行卡',
                        fee: '1.0%',
                        fx: '無',
                        bonus: '1.5%',
                        status: <span style={{ color: 'var(--color-text-secondary)' }}>可作備援卡</span>,
                        haystack: 'B 銀行卡 1.0% 無匯率優惠 1.5% 備援',
                      },
                    ].filter((r) => matchesQuery(r.haystack))

                    return rows.length > 0 ? (
                      rows.map((r) => (
                        <tr key={r.key} className={r.className}>
                          <td>{r.card}</td>
                          <td>{r.fee}</td>
                          <td>{r.fx}</td>
                          <td>{r.bonus}</td>
                          <td>{r.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ color: 'var(--color-text-secondary)' }}>
                          找不到符合「{travelQuery}」的結果
                        </td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="clabel">目的地智慧建議</div>
              <div className="insight-title">{travelInsight.recommendation.title}</div>
              <div className="cc-sub" style={{ marginTop: 4 }}>{travelInsight.recommendation.action}</div>
              <div className="info-bar" style={{ marginTop: 10 }}>
                建議主力卡：<strong style={{ color: 'var(--g800)' }}>{travelInsight.recommendation.bestCard}</strong>
              </div>
            </div>

            <div className="card">
              <div className="clabel">銀行公告隱藏條件（白話提醒）</div>
              <div className="notice-list">
                {travelInsight.notices.map((n) => (
                  <div className="notice-item" key={n.bank}>
                    <div className="notice-bank">{n.bank}</div>
                    <div className="cc-sub" style={{ marginTop: 2 }}>原始條件：{n.raw}</div>
                    <div className="notice-plain">行動提醒：{n.plain}</div>
                  </div>
                ))}
              </div>
            </div>

            {matchesQuery('申辦 @GOGO 多 2% 回饋 NT$600') ? (
              <div className="warn-bar">申辦中信 @GOGO 可多 2% 回饋，行程消費 NT$30,000 可多賺 NT$600。<strong style={{ color: '#7A5200', cursor: 'pointer' }}>立即申辦 →</strong></div>
            ) : null}
            {matchesQuery('中信卡使用佔比 38% 多賺 NT$420') ? (
              <div className="info-bar">中信卡使用佔比僅 38%，切換 Everywhere 卡可達成本季滿額禮門檻並多賺 NT$420。</div>
            ) : null}
            <div className="card">
              <div className="clabel">行前時間軸待辦</div>
              <div className="timeline">
                {travelInsight.timeline
                  .filter((t) => matchesQuery(`${t.day} ${t.task}`))
                  .map((t) => (
                    <div className="timeline-item" key={t.day}>
                      <div className="timeline-day">{t.day}</div>
                      <div className="timeline-line" />
                      <div className="timeline-task">{t.task}</div>
                    </div>
                  ))}
              </div>
              {travelInsight.timeline.filter((t) => matchesQuery(`${t.day} ${t.task}`)).length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>時間軸沒有符合「{travelQuery}」的項目</div>
              ) : null}
            </div>
          </div>
        </div>
      ),
    } satisfies Record<TabId, React.ReactNode>
  }, [countries, geo, merchantId, matchesQuery, payMode, payPriority, payRecommendation, proactiveMessage, q, travelCountry, travelQuery, userCards, isInsideGeofence, merchantProfile])

  return (
    <div className="wrap" id="root-phone">
      <div className="sbar">
        <div className="sb-left" aria-label="時間">{timeText}</div>
        <div className="sb-notch" aria-hidden="true" />
        <div className="sb-right" aria-label="狀態列">
          <div className="sb-signal" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <div className="sb-battery" aria-label="電量 76%">
            <div className="sb-battery-body">
              <div className="sb-battery-fill" style={{ width: '76%' }} />
            </div>
            <div className="sb-battery-cap" />
          </div>
        </div>
      </div>

      {screens[tab]}

      <div className="nav">
        <button className={`nb ${tab === 'home' ? 'on' : ''}`} onClick={() => setTab('home')}>
          <div className="ni"><Icon name="home" /></div>首頁
        </button>
        <button className={`nb ${tab === 'cards' ? 'on' : ''}`} onClick={() => setTab('cards')}>
          <div className="ni"><Icon name="card" /></div>卡片
        </button>
        <button className={`nb ${tab === 'pay' ? 'on' : ''}`} onClick={() => setTab('pay')}>
          <div className="ni"><Icon name="pay" /></div>支付
        </button>
        <button className={`nb ${tab === 'travel' ? 'on' : ''}`} onClick={() => setTab('travel')}>
          <div className="ni"><Icon name="travel" /></div>出國
        </button>
      </div>

      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
      <AddCardModal
        open={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onSave={({ name, type, cardNumber, cardId, cardName: selectedCardName }) => {
          const last4 = cardNumber.slice(-4)
          const masked = `**** **** **** ${last4}`
          const badge =
            type === '旅遊/海外'
              ? { text: '旅遊', style: { background: '#E8EEFF', color: '#1A3080' } }
              : type === '哩程'
                ? { text: '哩程', style: { background: 'var(--g50)', color: 'var(--g800)' } }
                : type === '現金回饋'
                  ? { text: '回饋', style: { background: 'var(--g50)', color: 'var(--g800)' } }
                  : { text: '新卡', style: { background: 'var(--color-background-tertiary)', color: 'var(--color-text-secondary)' } }

          // 異步載入爬蟲數據以獲取卡片信息
          loadCreditCardsData().then(data => {
            const ctbcCard = cardId ? data.creditCards.find(c => c.cardId === cardId) : null

            setUserCards((prev) => [
              ...prev,
              {
                id: `user-${Date.now()}`,
                name,
                issuer: name.includes('中信') || type === '旅遊/海外' || !!cardId ? 'ctbc' : 'other',
                bank: 'ctbc',  // 目前預設為中信，未來可根據用戶選擇動態設置
                type,
                masked,
                note: `${type} 自動規則同步`,
                priority: prev.length + 1,
                tags: ['日常購物'],
                monthlyReward: 0,
                usageCount: 0,
                categorySplit: { dining: 0, travel: 0, daily: 100 },
                badgeText: badge.text,
                badgeStyle: badge.style,
                chipBg: 'var(--g800)',
                goRate: type === '旅遊/海外' ? '3%' : '1%',
                goReminder: '請先確認活動是否需登錄與單筆門檻',
                rules: {
                  general: ['一般消費回饋依銀行公告'],
                  overseas: ['海外刷卡回饋依當期活動公告'],
                  ecommerce: ['網購/外送類別依平台與月份不同'],
                },
                sourceUrl: ctbcCard?.introLink || 'https://www.ctbcbank.com/twrbo/zh_tw/cc_index/cc_product/cc_hot.html',
                // 爬蟲數據字段
                cardId,
                cardName: selectedCardName,
                cardImg: ctbcCard?.cardImg || [],
                cardFeature: ctbcCard?.cardFeature || [],
                introLink: ctbcCard?.introLink,
              },
            ])
          })
        }}
      />
      <div className={`modal-wrap ${rewardDetailOpen ? 'on' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-sheet">
          <div className="rbet" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>本月回饋詳細資訊</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>回饋拆解與最優選卡成果（示意）</div>
            </div>
            <button onClick={() => setRewardDetailOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="rbet">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>已獲回饋</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>$1,247</div>
            </div>
            <div className="div" style={{ margin: '10px 0' }} />
            <div className="rbet">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>聰明選卡多賺</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g800)' }}>$380</div>
            </div>
          </div>

          <div className="card" style={{ padding: 12, marginTop: 10 }}>
            <div className="clabel" style={{ marginBottom: 8 }}>卡片貢獻（示意）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div className="rbet" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>中信 Everywhere</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--g800)' }}>$820</span>
                </div>
                <div className="prog"><div className="progb" style={{ width: '66%' }} /></div>
              </div>
              <div>
                <div className="rbet" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>中信 @GOGO</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--g800)' }}>$310</span>
                </div>
                <div className="prog"><div className="progb" style={{ width: '25%', background: 'var(--g400)' }} /></div>
              </div>
              <div>
                <div className="rbet" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>其他</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>$117</span>
                </div>
                <div className="prog"><div className="progb" style={{ width: '9%', background: 'rgba(11,42,74,0.28)' }} /></div>
              </div>
            </div>
          </div>

          <div className="info-bar" style={{ marginTop: 10 }}>
            最優選卡依「通路/活動門檻/回饋上限」即時調整，並以同一 AI 引擎同步推播與掃碼建議（示意）。
          </div>
        </div>
        <button className="modal-backdrop" onClick={() => setRewardDetailOpen(false)} aria-label="Close" />
      </div>

      <div className={`modal-wrap ${selectedCard ? 'on' : ''}`} role="dialog" aria-modal="true">
        <div 
          className="modal-sheet"
          style={{
            maxHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px 16px 0 0'
          }}
        >
          <div 
            className="rbet" 
            style={{ 
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{selectedCard?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{selectedCard?.masked}</div>
            </div>
            <button onClick={() => setCardDetailId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 4,
              paddingBottom: 16
            }}
          >

          {/* 卡片照片展示 */}
          {selectedCard?.cardImg && selectedCard.cardImg.length > 0 ? (
            <div className="card" style={{ padding: 12, marginBottom: 10 }}>
              <div className="clabel" style={{ marginBottom: 8 }}>卡片圖片</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                {selectedCard.cardImg.map((img, idx) => (
                  <img
                    key={idx}
                    src={ensureFullUrl(img, selectedCard.bank || 'ctbc')}
                    alt={`${selectedCard.cardName} 卡片 ${idx + 1}`}
                    style={{
                      height: 120,
                      borderRadius: 8,
                      flexShrink: 0,
                      objectFit: 'cover'
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* 機構回饋簡介 */}
          {selectedCard?.cardFeature && selectedCard.cardFeature.length > 0 ? (
            <div className="card" style={{ padding: 12, marginBottom: 10 }}>
              <div className="clabel" style={{ marginBottom: 8 }}>信用卡優惠簡介</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedCard.cardFeature.map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-primary)',
                      paddingLeft: 8,
                      borderLeft: '3px solid var(--g400)',
                      paddingTop: 4,
                      paddingBottom: 4
                    }}
                  >
                    • {feature}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card" style={{ padding: 12 }}>
            <div className="clabel" style={{ marginBottom: 8 }}>第一層：消費當下建議（Go）</div>
            <div className="rbet">
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>推薦卡片</span>
              <strong style={{ fontSize: 13, color: 'var(--g800)' }}>{selectedCard?.name}</strong>
            </div>
            <div className="rbet" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>預計回饋率</span>
              <strong style={{ fontSize: 13, color: 'var(--g800)' }}>{selectedCard?.goRate}</strong>
            </div>
            <div className="warn-bar" style={{ marginTop: 8 }}>關鍵提醒：{selectedCard?.goReminder}</div>
          </div>

          <div className="card" style={{ padding: 12, marginTop: 10 }}>
            <div className="clabel" style={{ marginBottom: 8 }}>第二層：卡片詳細清單（Review）</div>
            <div className="rule-tabs">
              <button className={`rule-tab ${ruleTab === 'general' ? 'on' : ''}`} type="button" onClick={() => setRuleTab('general')}>一般消費</button>
              <button className={`rule-tab ${ruleTab === 'overseas' ? 'on' : ''}`} type="button" onClick={() => setRuleTab('overseas')}>海外旅遊</button>
              <button className={`rule-tab ${ruleTab === 'ecommerce' ? 'on' : ''}`} type="button" onClick={() => setRuleTab('ecommerce')}>網購外送</button>
            </div>
            <div className="rule-list">
              {(selectedCard?.rules[ruleTab] ?? []).map((item) => (
                <div key={item} className="rule-item">- {item}</div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 12, marginTop: 10 }}>
            <div className="clabel" style={{ marginBottom: 6 }}>第三層：原始條款對照（Source）</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>如需核對完整條款，請前往銀行官網原文頁。</div>
            <button
              className="link-btn"
              type="button"
              style={{ marginTop: 8, paddingLeft: 0 }}
              onClick={() => {
                // 優先使用爬蟲數據中的 introLink，否則使用 sourceUrl
                const bank = selectedCard?.bank || 'ctbc'
                const url = ensureFullUrl(selectedCard?.introLink, bank) || ensureFullUrl(selectedCard?.sourceUrl, bank)
                if (!url) return
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
            >
              查看原文 →
            </button>
          </div>
          </div>
        </div>
        <button className="modal-backdrop" onClick={() => setCardDetailId(null)} aria-label="Close" />
      </div>
    </div>
  )
}

export default App
