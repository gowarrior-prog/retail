'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ShoppingCart,
  X,
  Mic,
  Plus,
  TrendingUp,
  Flame,
  Printer,
  BookOpen,
  Lock,
  Trash2,
  UserCheck,
  Package,
  ArrowUp,
} from 'lucide-react';
import { chatWithAI, fetchAIStatus, NLOrderItem, AIChatResult } from '@/lib/api/ai';
import { useCartStore } from '@/stores/useCartStore';
import { showCatalogToast } from '@/lib/toast';
import { apiFetch } from '@/lib/api/client';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text?: string;
  intent?: string;
  items?: NLOrderItem[];
  analytics_data?: AIChatResult['analytics_data'];
  ledger_data?: AIChatResult['ledger_data'];
  product_data?: AIChatResult['product_data'];
  employee_data?: AIChatResult['employee_data'];
  print_data?: AIChatResult['print_data'];
  requires_pin?: boolean;
  action_executed?: string | null;
  timestamp: string;
}

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* Numbers count up when a card appears */
function CountUp({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <>
      {prefix}
      {display.toLocaleString()}
    </>
  );
}

/* "Thread being woven" loader shown while the AI is thinking */
function ThreadLoader() {
  return (
    <div className="aim-row-in flex items-center gap-2.5 py-1">
      <div className="aim-avatar-sm">
        <Sparkles className="w-3 h-3" />
      </div>
      <div className="aim-typing">
        <svg viewBox="0 0 72 18" width="72" height="18" fill="none" aria-hidden="true">
          <path
            className="aim-thread-base"
            d="M2 9 C 10 1, 18 17, 27 9 S 45 1, 54 9 S 64 15, 70 9"
          />
          <path
            className="aim-thread-run"
            d="M2 9 C 10 1, 18 17, 27 9 S 45 1, 54 9 S 64 15, 70 9"
          />
        </svg>
        <span className="aim-typing-text">Soch raha hoon</span>
      </div>
    </div>
  );
}

function ProductThumb({ alt }: { alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="aim-thumb">
      {failed ? (
        <Package className="w-6 h-6 text-[#0b1d15]/50" />
      ) : (
        <img
          src="/Screenshot 2026-09-26 210204.svg"
          alt={alt}
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function AIManagerWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiEngine, setAiEngine] = useState<'gemini_cloud' | 'offline_nlp'>('gemini_cloud');

  // Admin PIN prompt state
  const [pinPromptMessageId, setPinPromptMessageId] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');

  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // messages at index < this are "old" (no entrance animation when window re-opens)
  const seenCountRef = useRef(0);

  const {
    items: cartItems,
    addItem,
    addMultipleItems,
    updateQuantity,
    removeItem,
    clearCart,
    setItemDiscount,
    cashierName,
  } = useCartStore();
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Initial AI status & load persistent chat history
  useEffect(() => {
    fetchAIStatus()
      .then((status) => setAiEngine(status.primary_engine || 'gemini_cloud'))
      .catch(() => setAiEngine('gemini_cloud'));

    try {
      const saved = localStorage.getItem('bilal_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }

    setMessages([
      {
        id: 'msg-1',
        sender: 'ai',
        intent: 'chat',
        text: 'Main Bilal Cloth ka AI Manager hoon. Aap mujh se sales analytics, fabric market trends, billing orders, khata ledger, ya koi bhi aam maloomat poch sakte hain.',
        timestamp: nowTime(),
      },
    ]);
  }, []);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('bilal_ai_chat_history', JSON.stringify(messages));
      } catch {
        // quota fallback
      }
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isProcessing, isOpen]);

  // Focus input when window opens
  useEffect(() => {
    if (isOpen && !isClosing) {
      const t = setTimeout(() => inputRef.current?.focus(), 380);
      return () => clearTimeout(t);
    }
  }, [isOpen, isClosing]);

  // Open / close with exit animation
  const openWindow = () => {
    seenCountRef.current = messages.length;
    setIsClosing(false);
    setIsOpen(true);
  };
  const closeWindow = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 220);
  };
  const toggleWindow = () => (isOpen && !isClosing ? closeWindow() : openWindow());

  const handleClearChatHistory = () => {
    try {
      localStorage.removeItem('bilal_ai_chat_history');
    } catch {}
    seenCountRef.current = 0;
    setPinPromptMessageId(null);
    setEnteredPin('');
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        intent: 'chat',
        text: 'Chat history saaf ho gayi hai. Main aapki kya madad karoon?',
        timestamp: nowTime(),
      },
    ]);
    showCatalogToast('✓ Chat history cleared', 'scan');
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showCatalogToast('Speech recognition not supported in this browser.', 'scan');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ur-PK';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSendMessage = async (textToSend?: string, withPin?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    const lowerText = text.toLowerCase();

    // ── SECURE CART MUTATION HANDLERS (Client-Side State Safe) ──
    // 1. Clear cart / bill
    if (
      lowerText.includes('clear cart') ||
      lowerText.includes('clear bill') ||
      lowerText.includes('khali karo cart') ||
      lowerText.includes('cart clear karo') ||
      lowerText.includes('saaf karo cart')
    ) {
      clearCart();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        intent: 'cart_mutation',
        text: '✓ Cart and billing table have been cleared safely.',
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      showCatalogToast('✓ Cart cleared safely', 'scan');
      return;
    }

    // 2. Remove specific item from cart
    const removeMatch = lowerText.match(/(?:remove|delete|hatao|nikalo)\s+([a-z0-9\s]+?)\s+(?:from\s+cart|cart\s+se)/i);
    if (removeMatch && removeMatch[1]) {
      const targetQuery = removeMatch[1].trim().toLowerCase();
      const foundItem = cartItems.find((i) =>
        i.name.toLowerCase().includes(targetQuery) || i.sku.toLowerCase() === targetQuery
      );
      if (foundItem) {
        removeItem(foundItem.id);
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          intent: 'cart_mutation',
          text: `✓ Removed "${foundItem.name}" from cart.`,
          timestamp: nowTime(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        showCatalogToast(`✓ Removed ${foundItem.name}`, 'scan');
        return;
      }
    }

    // 3. Update quantity in cart
    const qtyMatch = lowerText.match(/(?:change|update|set|badlo|karo)\s+([a-z0-9\s]+?)\s+quantity\s+(?:to|=)\s*(\d+)/i) ||
                     lowerText.match(/(?:change|update|set|badlo|karo)\s+quantity\s+of\s+([a-z0-9\s]+?)\s+(?:to|=)\s*(\d+)/i);
    if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
      const targetQuery = qtyMatch[1].trim().toLowerCase();
      const newQty = Math.max(1, Math.min(500, parseInt(qtyMatch[2], 10)));
      const foundItem = cartItems.find((i) =>
        i.name.toLowerCase().includes(targetQuery) || i.sku.toLowerCase() === targetQuery
      );
      if (foundItem) {
        updateQuantity(foundItem.id, newQty);
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          intent: 'cart_mutation',
          text: `✓ Updated "${foundItem.name}" quantity to ${newQty}.`,
          timestamp: nowTime(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        showCatalogToast(`✓ Quantity updated: ${newQty}`, 'scan');
        return;
      }
    }

    // 4. Reset/Remove discount from item
    if (
      lowerText.includes('remove discount') ||
      lowerText.includes('discount hatao') ||
      lowerText.includes('zero discount')
    ) {
      cartItems.forEach((item) => setItemDiscount(item.id, 0));
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        intent: 'cart_mutation',
        text: '✓ All promotional discounts removed from cart items.',
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      showCatalogToast('✓ Discounts reset to 0%', 'scan');
      return;
    }

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text || '',
      }));
      const activeRole = (cashierName || '').toLowerCase().includes('admin') ||
                         (cashierName || '').toLowerCase().includes('owner') ||
                         (cashierName || '').toLowerCase().includes('manager')
                           ? 'manager'
                           : 'cashier';
      const res = await chatWithAI(text, historyPayload, withPin, activeRole, cashierName || 'cashier-1');
      if (res.engine) setAiEngine(res.engine as any);

      const aiMsgId = `ai-${Date.now()}`;
      const newAiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        intent: res.intent,
        text: res.reply_text,
        items: res.items,
        analytics_data: res.analytics_data,
        ledger_data: res.ledger_data,
        product_data: res.product_data,
        employee_data: res.employee_data,
        print_data: res.print_data,
        requires_pin: res.requires_pin,
        action_executed: res.action_executed,
        timestamp: nowTime(),
      };

      setMessages((prev) => [...prev, newAiMsg]);

      if (res.action_executed) {
        showCatalogToast(`✓ ${res.action_executed}`, 'scan');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('khata-updated'));
          window.dispatchEvent(new CustomEvent('pos-data-updated'));
          window.dispatchEvent(new CustomEvent('catalog-updated'));
          window.dispatchEvent(new CustomEvent('employee-updated'));
        }
      }

      if (res.requires_pin) {
        setPinPromptMessageId(aiMsgId);
      } else {
        setPinPromptMessageId(null);
        setEnteredPin('');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          intent: 'chat',
          text: 'Main aapka paigham process nahi kar saka. Barah-e-karam dobara koshish karein.',
          timestamp: nowTime(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPin.trim()) return;
    handleSendMessage(`Verify PIN: ${enteredPin}`, enteredPin);
  };

  const getItemDisplayName = (item: NLOrderItem) => {
    if (item.category && item.category !== 'Fabric' && (!item.name || !isNaN(Number(item.name)))) {
      return item.category;
    }
    return item.name || item.category || 'Fabric Item';
  };

  const handleAddToCart = (item: NLOrderItem) => {
    const finalName = getItemDisplayName(item);
    addItem(
      {
        id: item.product_id,
        name: finalName,
        price: item.unit_price ?? item.price ?? 0,
        cost_price: item.cost_price || 0,
        sku: item.sku,
        category: item.category || 'Fabric',
        stock: 999,
      },
      item.quantity || 1
    );
    showCatalogToast(`✓ Added to cart: ${item.quantity}x ${finalName}`, 'scan');
  };

  const handleAddAllToCart = (items: NLOrderItem[]) => {
    const list = items.map((i) => ({
      id: i.product_id,
      name: getItemDisplayName(i),
      price: i.unit_price ?? i.price ?? 0,
      cost_price: i.cost_price || 0,
      quantity: i.quantity || 1,
      sku: i.sku,
      category: i.category || 'Fabric',
    }));
    addMultipleItems(list);
    showCatalogToast(`✓ Added ${items.length} items to cart`, 'scan');
  };

  const handlePrintReceipt = async (printData: any) => {
    try {
      showCatalogToast('Sending bill to thermal printer...', 'scan');
      await apiFetch('/printer/print-receipt', {
        method: 'POST',
        body: JSON.stringify({
          invoice_number: printData.invoice_number,
          items: printData.items || [],
          grand_total: printData.total_amount || 0,
          payment_mode: printData.payment_mode || 'CASH',
        }),
      });
      showCatalogToast('✓ Receipt printed successfully!', 'scan');
    } catch (e: any) {
      showCatalogToast(`Print status: ${e.message || 'Sent to spooler'}`, 'scan');
    }
  };

  const quickActions = [
    { label: 'Aaj ki sales', hint: 'Revenue aur bills', prompt: 'give me today sales analytics', Icon: TrendingUp },
    { label: 'Market trends', hint: 'Kya chal raha hai', prompt: 'latest market fabric trends', Icon: Flame },
    { label: 'Khata dues', hint: 'Udhaar ka hisaab', prompt: 'customer khata ledger summary', Icon: BookOpen },
    { label: 'Last bill print', hint: 'Thermal receipt', prompt: 'print last bill receipt', Icon: Printer },
  ];

  const isOnline = aiEngine === 'gemini_cloud';
  const showWelcomeGrid = messages.length <= 1 && !isProcessing;
  const canSend = inputMessage.trim().length > 0 && !isProcessing;

  return (
    <div className="aim-scope">
      {/* ───────── Floating launcher ───────── */}
      <div className="fixed bottom-5 right-5 z-50 select-none aim-launcher-wrap" data-open={isOpen}>
        <button
          onClick={toggleWindow}
          className="aim-launcher"
          title="Bilal Cloth AI Manager"
          aria-label="Open AI Manager"
          aria-expanded={isOpen}
        >
          <span className="aim-launcher-ring" />
          <span className="aim-launcher-body">
            <span className="aim-launcher-icon">
              <Sparkles className="aim-launcher-spark w-[18px] h-[18px]" />
            </span>
            <span className="aim-launcher-label">AI Manager</span>
          </span>
        </button>
        <span className="aim-status-dot" data-online={isOnline}>
          <span className="aim-status-ping" />
        </span>
      </div>

      {/* ───────── Chat window ───────── */}
      {isOpen && (
        <div
          className="aim-window fixed bottom-24 right-5 z-50 w-[420px] max-w-[94vw] h-[640px] max-h-[calc(100vh-7.5rem)] flex flex-col overflow-hidden"
          data-state={isClosing ? 'closing' : 'open'}
          role="dialog"
          aria-label="AI Manager chat"
        >
          {/* Header */}
          <div className="aim-header shrink-0">
            <div className="flex items-center gap-3">
              <div className="aim-orb">
                <span className="aim-orb-core">
                  <Sparkles className="w-[18px] h-[18px]" />
                </span>
              </div>
              <div className="leading-tight">
                <h3 className="aim-title">AI Manager</h3>
                <span className="aim-sub">
                  <span className="aim-dot-live" data-online={isOnline} />
                  {isOnline ? 'Online' : 'Offline mode'} · Bilal Cloth &amp; Silk
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={handleClearChatHistory} className="aim-icon-btn aim-icon-danger" title="Chat saaf karein">
                <Trash2 className="w-4 h-4" />
              </button>
              <button className="aim-icon-btn relative" title={`Cart: ${totalCartCount} items`}>
                <ShoppingCart className="w-4 h-4" />
                {totalCartCount > 0 && (
                  <span key={totalCartCount} className="aim-cart-badge">
                    {totalCartCount}
                  </span>
                )}
              </button>
              <button onClick={closeWindow} className="aim-icon-btn" title="Band karein">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="aim-header-line shrink-0" />

          {/* Feed */}
          <div ref={chatScrollRef} className="aim-feed aim-scroll flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, idx) => {
              const fresh = idx >= seenCountRef.current;
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
                    fresh ? (isUser ? 'aim-in-right' : 'aim-in-up') : ''
                  }`}
                >
                  {/* User bubble */}
                  {isUser && (
                    <div className="max-w-[82%] flex flex-col items-end gap-1">
                      <div className="aim-bubble-user">{msg.text}</div>
                      <span className="aim-time">{msg.timestamp}</span>
                    </div>
                  )}

                  {/* AI bubble + cards */}
                  {!isUser && (
                    <div className="flex items-start gap-2.5 w-full">
                      <div className="aim-avatar-sm mt-0.5">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2.5">
                        {msg.text && (
                          <div className="flex flex-col items-start gap-1">
                            <div className="aim-bubble-ai">{msg.text}</div>
                            <span className="aim-time">{msg.timestamp}</span>
                          </div>
                        )}

                        {/* Analytics */}
                        {msg.analytics_data && (
                          <div className="aim-card" style={{ ['--i' as any]: 1 }}>
                            <div className="aim-card-head">
                              <span className="aim-card-title">
                                <TrendingUp className="w-3.5 h-3.5 text-[#3ddc97]" />
                                Aaj ki performance
                              </span>
                              <span className="aim-chip aim-chip-live">
                                <span className="aim-chip-dot" /> Live
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="aim-stat aim-stat-hero col-span-2">
                                <span className="aim-stat-label">Today&apos;s Sales</span>
                                <span className="aim-stat-big">
                                  <CountUp prefix="Rs " value={Number(msg.analytics_data.today_revenue) || 0} />
                                </span>
                              </div>
                              <div className="aim-stat">
                                <span className="aim-stat-label">Invoices</span>
                                <span className="aim-stat-val">
                                  <CountUp value={Number(msg.analytics_data.today_bills_count) || 0} /> Bills
                                </span>
                              </div>
                              <div className="aim-stat">
                                <span className="aim-stat-label">Khata Outstanding</span>
                                <span className="aim-stat-val text-[#e0b863]">
                                  <CountUp prefix="Rs " value={Number(msg.analytics_data.khata_outstanding) || 0} />
                                </span>
                              </div>
                              <div className="aim-stat col-span-2">
                                <span className="aim-stat-label">Top Product</span>
                                <span className="aim-stat-val truncate block">
                                  {msg.analytics_data.top_selling_products?.[0]?.name || 'No sales yet'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Trends */}
                        {msg.intent === 'trends' && (
                          <div className="aim-card aim-card-gold" style={{ ['--i' as any]: 1 }}>
                            <div className="aim-card-title text-[#e0b863]">
                              <Flame className="w-3.5 h-3.5 fill-[#e0b863]" />
                              Textile market highlights
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-2.5">
                              {['✨ Pure Boski (Formal)', '🧵 Egyptian Latha', '🌸 Digital Printed Lawn'].map((t, i) => (
                                <span key={t} className="aim-tag" style={{ ['--i' as any]: i + 2 }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ledger */}
                        {msg.ledger_data && msg.ledger_data.customers && msg.ledger_data.customers.length > 0 && (
                          <div className="aim-card" style={{ ['--i' as any]: 1 }}>
                            <div className="aim-card-head">
                              <span className="aim-card-title">
                                <BookOpen className="w-3.5 h-3.5 text-[#7dd3fc]" />
                                Customer ledgers
                              </span>
                              <span className="aim-chip">Due Rs {msg.ledger_data.total_due?.toLocaleString()}</span>
                            </div>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto aim-scroll pr-1">
                              {msg.ledger_data.customers.map((c, i) => (
                                <div key={i} className="aim-ledger-row" style={{ ['--i' as any]: i + 2 }}>
                                  <div className="min-w-0">
                                    <span className="block font-semibold text-[#f3ecda] text-[12.5px] truncate">{c.name}</span>
                                    <span className="text-[10.5px] text-[#97ad9f]">{c.phone || 'No Phone'}</span>
                                  </div>
                                  <span className="font-extrabold text-[#e0b863] text-[12.5px] shrink-0">
                                    Rs {c.balance?.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Employee */}
                        {msg.employee_data && (
                          <div className="aim-card aim-card-jade" style={{ ['--i' as any]: 1 }}>
                            <div className="aim-card-head">
                              <span className="aim-card-title">
                                <UserCheck className="w-3.5 h-3.5 text-[#3ddc97]" />
                                Employee registered
                              </span>
                              <span className="aim-chip aim-chip-live">Saved</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="block font-bold text-[#f3ecda] text-[13px] truncate">{msg.employee_data.name}</span>
                                <span className="text-[11px] text-[#97ad9f]">
                                  {msg.employee_data.job_title} • {msg.employee_data.phone || 'No Phone'}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10.5px] text-[#97ad9f] block">Monthly pay</span>
                                <span className="font-extrabold text-[#3ddc97] text-[13px]">
                                  {msg.employee_data.salary && msg.employee_data.salary > 0
                                    ? `Rs ${msg.employee_data.salary.toLocaleString()}`
                                    : 'Not specified'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Product saved */}
                        {msg.product_data && (
                          <div className="aim-card aim-card-gold" style={{ ['--i' as any]: 1 }}>
                            <div className="aim-card-head">
                              <span className="aim-card-title">
                                <Package className="w-3.5 h-3.5 text-[#e0b863]" />
                                Catalog item saved
                              </span>
                              <span className="aim-chip aim-chip-gold">Ready for sale</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="block font-bold text-[#f3ecda] text-[13px] truncate">{msg.product_data.name}</span>
                                <span className="text-[11px] text-[#97ad9f]">
                                  SKU: {msg.product_data.sku} • {msg.product_data.category}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10.5px] text-[#97ad9f] block">Price</span>
                                <span className="font-extrabold text-[#f3ecda] text-[13px]">
                                  Rs {msg.product_data.price?.toLocaleString() || '0'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Print bill */}
                        {msg.print_data && (
                          <div className="aim-card" style={{ ['--i' as any]: 1 }}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="font-bold text-[13px] text-[#f3ecda] block truncate">
                                  Invoice: {msg.print_data.invoice_number}
                                </span>
                                <span className="text-[11px] text-[#97ad9f]">
                                  Rs {msg.print_data.total_amount?.toLocaleString()} • {msg.print_data.payment_mode}
                                </span>
                              </div>
                              <button onClick={() => handlePrintReceipt(msg.print_data)} className="aim-btn-gold">
                                <Printer className="w-3.5 h-3.5" />
                                Print
                              </button>
                            </div>
                          </div>
                        )}

                        {/* PIN prompt */}
                        {msg.requires_pin && pinPromptMessageId === msg.id && (
                          <form onSubmit={handlePinSubmit} className="aim-card aim-card-warn space-y-2.5" style={{ ['--i' as any]: 1 }}>
                            <div className="aim-card-title text-[#fbbf24]">
                              <Lock className="w-3.5 h-3.5" />
                              Admin PIN zaroori hai
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                inputMode="numeric"
                                value={enteredPin}
                                onChange={(e) => setEnteredPin(e.target.value)}
                                placeholder="4-digit PIN"
                                className="aim-pin-input"
                                autoFocus
                              />
                              <button type="submit" className="aim-btn-gold">
                                Confirm
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Product cards */}
                        {msg.items && msg.items.length > 0 && (
                          <div className="space-y-2.5">
                            {msg.items.map((item, i) => {
                              const title = getItemDisplayName(item);
                              const price = item.unit_price ?? item.price ?? 0;
                              return (
                                <div key={i} className="aim-card aim-product" style={{ ['--i' as any]: i + 1 }}>
                                  <div className="flex items-center gap-3">
                                    <ProductThumb alt={title} />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-[13px] text-[#f3ecda] truncate">
                                        {item.quantity > 1 ? `${item.quantity}x ` : ''}
                                        {title}
                                      </h4>
                                      <p className="text-[13px] font-extrabold text-[#e0b863] mt-0.5">
                                        Rs {price.toLocaleString()}
                                      </p>
                                      <p className="text-[10.5px] text-[#97ad9f] mt-0.5 truncate">
                                        SKU: {item.sku} • {item.category || 'Fabric'}
                                      </p>
                                    </div>
                                  </div>
                                  <button onClick={() => handleAddToCart(item)} className="aim-btn-gold aim-btn-block mt-3">
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    Add to cart
                                  </button>
                                </div>
                              );
                            })}

                            {msg.items.length > 1 && (
                              <button onClick={() => handleAddAllToCart(msg.items!)} className="aim-btn-ghost aim-btn-block">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Add all {msg.items.length} items to cart
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Welcome quick-action grid */}
            {showWelcomeGrid && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {quickActions.map(({ label, hint, prompt, Icon }, i) => (
                  <button
                    key={label}
                    onClick={() => handleSendMessage(prompt)}
                    className="aim-quick"
                    style={{ ['--i' as any]: i + 2 }}
                  >
                    <span className="aim-quick-icon">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="block text-left">
                      <span className="block text-[12.5px] font-bold text-[#f3ecda]">{label}</span>
                      <span className="block text-[10.5px] text-[#97ad9f]">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {isProcessing && <ThreadLoader />}
          </div>

          {/* Composer */}
          <div className="aim-composer shrink-0">
            {!showWelcomeGrid && (
              <div className="aim-chips no-scrollbar">
                {quickActions.map(({ label, prompt, Icon }) => (
                  <button key={label} onClick={() => handleSendMessage(prompt)} disabled={isProcessing} className="aim-chip-btn">
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="aim-input" data-listening={isListening}>
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder={isListening ? 'Sun raha hoon…' : 'Bilal Cloth AI se poochein…'}
              />

              <button
                type="button"
                onClick={toggleSpeech}
                className="aim-mic"
                data-active={isListening}
                title={isListening ? 'Sun raha hoon…' : 'Voice input'}
                aria-label="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!canSend}
                className="aim-send"
                data-ready={canSend}
                title="Send"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.75]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}