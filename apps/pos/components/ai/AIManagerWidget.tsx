'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ShoppingCart,
  X,
  Send,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  Zap,
  ShieldCheck,
  TrendingUp,
  Flame,
  Printer,
  BookOpen,
  Lock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Trash2,
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
  print_data?: AIChatResult['print_data'];
  requires_pin?: boolean;
  action_executed?: string | null;
  timestamp: string;
}

export default function AIManagerWidget() {
  const [isOpen, setIsOpen] = useState(false);
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

  const { items: cartItems, addItem, addMultipleItems } = useCartStore();
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Initial AI status & load persistent chat history from localStorage
  useEffect(() => {
    fetchAIStatus()
      .then((status) => {
        setAiEngine(status.primary_engine || 'gemini_cloud');
      })
      .catch(() => {
        setAiEngine('gemini_cloud');
      });

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
        text: 'Assalam-o-Alaikum! Main Bilal Cloth ka AI Manager hoon. Aap mujh se sales analytics, fabric market trends, billing orders, khata ledger, ya koi bhi science o aam maloomat poch sakte hain.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Persist messages to localStorage whenever they update
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('bilal_ai_chat_history', JSON.stringify(messages));
      } catch {
        // quota fallback
      }
    }
  }, [messages]);

  // Clear Chat History Handler
  const handleClearChatHistory = () => {
    try {
      localStorage.removeItem('bilal_ai_chat_history');
    } catch {}
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        intent: 'chat',
        text: 'Chat history saaf ho gayi hai. Main aapki kya madad karoon?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showCatalogToast('✓ Chat history cleared', 'scan');
  };

  // Auto-scroll chat to bottom smoothly
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isProcessing, isOpen]);

  // Speech Recognition setup
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

    // Add user message to feed
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text || '',
      }));
      const res = await chatWithAI(text, historyPayload, withPin);
      if (res.engine) {
        setAiEngine(res.engine as any);
      }

      const aiMsgId = `ai-${Date.now()}`;
      const newAiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        intent: res.intent,
        text: res.reply_text,
        items: res.items,
        analytics_data: res.analytics_data,
        ledger_data: res.ledger_data,
        print_data: res.print_data,
        requires_pin: res.requires_pin,
        action_executed: res.action_executed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newAiMsg]);

      if (res.action_executed) {
        showCatalogToast(`✓ ${res.action_executed}`, 'scan');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('khata-updated'));
          window.dispatchEvent(new CustomEvent('pos-data-updated'));
          window.dispatchEvent(new CustomEvent('catalog-updated'));
        }
      }

      if (res.requires_pin) {
        setPinPromptMessageId(aiMsgId);
      } else {
        setPinPromptMessageId(null);
        setEnteredPin('');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          intent: 'chat',
          text: 'Main aapka paigham process nahi kar saka. Barah-e-karam dobara koshish karein.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const quickPills = [
    { label: '📊 Today Analytics', prompt: 'give me today sales analytics' },
    { label: '🔥 Market Trends', prompt: 'latest market fabric trends' },
    { label: '📋 Khata Dues', prompt: 'customer khata ledger summary' },
    { label: '🖨️ Print Last Bill', prompt: 'print last bill receipt' },
    { label: '2 Cotton Suits', prompt: '2 cotton suits' },
    { label: 'Pure Boski', prompt: 'Pure Boski' },
  ];

  return (
    <>
      {/* 🚀 Floating Pill Trigger Button in Bottom-Right Corner with micro-glow */}
      <div className="fixed bottom-5 right-5 z-50 select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center bg-black hover:bg-zinc-900 text-white rounded-full p-1.5 pr-4 shadow-2xl border border-zinc-700/80 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Bilal Cloth AI Manager"
        >
          {/* White circle with black four-pointed sparkle icon */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-md mr-2.5 shrink-0 transition-transform group-hover:rotate-12 duration-300">
            <Sparkles className="w-4.5 h-4.5 fill-black text-black" />
          </div>

          {/* Text label "Shop with AI" */}
          <span className="font-semibold text-xs tracking-wide text-zinc-100 group-hover:text-white">
            Shop with AI
          </span>

          {/* Online engine green indicator dot */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
        </button>
      </div>

      {/* 🪟 Sleek Dark Theme AI Assistant Window (Animated entrance) */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-[410px] max-w-[94vw] h-[610px] max-h-[86vh] bg-[#1c1c1e] text-white rounded-3xl shadow-2xl border border-zinc-800/90 flex flex-col font-sans overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 backdrop-blur-xl">
          {/* ─── Header ─── */}
          <div className="px-4 py-3 bg-[#1c1c1e]/90 border-b border-zinc-800/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 fill-black text-black" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-white leading-tight flex items-center gap-1.5">
                  Bilal Cloth AI
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full font-semibold border border-emerald-500/30">
                    Manager
                  </span>
                </h3>
                <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                  {aiEngine === 'gemini_cloud' ? (
                    <>
                      <Zap className="w-2.5 h-2.5 text-emerald-400" /> Gemini Intelligence
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-2.5 h-2.5 text-amber-400" /> Offline 0ms
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Header Right Action Icons */}
            <div className="flex items-center gap-1.5 text-zinc-400">
              {/* Clear chat history button */}
              <button
                onClick={handleClearChatHistory}
                className="p-1.5 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Clear AI Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                className="relative p-1.5 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title={`Cart: ${totalCartCount} items`}
              >
                <ShoppingCart className="w-4 h-4" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                    {totalCartCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Close AI Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── Scrollable Chat Feed ─── */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* User Message Bubble */}
                {msg.sender === 'user' && (
                  <div className="bg-white text-zinc-950 px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[85%] font-medium text-xs shadow-sm">
                    {msg.text}
                  </div>
                )}

                {/* AI Assistant Message Bubble & Specialized Cards */}
                {msg.sender === 'ai' && (
                  <div className="space-y-2.5 max-w-[100%] w-full">
                    {msg.text && (
                      <div className="bg-[#27272a]/70 border border-zinc-800 rounded-2xl px-3.5 py-2.5 text-zinc-200 text-xs leading-relaxed whitespace-pre-line shadow-xs">
                        {msg.text}
                      </div>
                    )}

                    {/* 1. 📊 ANALYTICS DATA CARD */}
                    {msg.analytics_data && (
                      <div className="bg-gradient-to-br from-[#27272a] to-[#1f1f23] border border-zinc-700/80 rounded-2xl p-3 space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between border-b border-zinc-700/60 pb-2">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            Store Daily Performance
                          </span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                            Live Telemetry
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-zinc-800/80 rounded-xl p-2 border border-zinc-700/50">
                            <span className="text-zinc-400 block text-[10px]">Today's Sales</span>
                            <span className="font-extrabold text-white text-xs">
                              Rs {msg.analytics_data.today_revenue?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div className="bg-zinc-800/80 rounded-xl p-2 border border-zinc-700/50">
                            <span className="text-zinc-400 block text-[10px]">Invoices</span>
                            <span className="font-extrabold text-white text-xs">
                              {msg.analytics_data.today_bills_count || 0} Bills
                            </span>
                          </div>
                          <div className="bg-zinc-800/80 rounded-xl p-2 border border-zinc-700/50">
                            <span className="text-zinc-400 block text-[10px]">Khata Outstanding</span>
                            <span className="font-extrabold text-amber-300 text-xs">
                              Rs {msg.analytics_data.khata_outstanding?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div className="bg-zinc-800/80 rounded-xl p-2 border border-zinc-700/50">
                            <span className="text-zinc-400 block text-[10px]">Top Product</span>
                            <span className="font-extrabold text-white text-xs truncate block">
                              {msg.analytics_data.top_selling_products?.[0]?.name || 'Cotton Latha'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. 🔥 MARKET & FASHION TRENDS CARD */}
                    {msg.intent === 'trends' && (
                      <div className="bg-gradient-to-br from-[#27272a] to-[#232029] border border-amber-800/40 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" />
                          <span>Textile Market Highlights</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-zinc-300 pt-1">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                            ✨ Pure Boski (Formal)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                            🧵 Egyptian Latha
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                            🌸 Digital Printed Lawn
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 3. 📋 CUSTOMER KHATA / LEDGER CARD */}
                    {msg.ledger_data && msg.ledger_data.customers && msg.ledger_data.customers.length > 0 && (
                      <div className="bg-[#27272a] border border-zinc-750 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-700/60">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                            Customer Ledgers
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold">
                            Total Due: Rs {msg.ledger_data.total_due?.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {msg.ledger_data.customers.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] bg-zinc-800/60 p-1.5 rounded-lg">
                              <div>
                                <span className="font-bold text-white block">{c.name}</span>
                                <span className="text-[9px] text-zinc-400">{c.phone || 'No Phone'}</span>
                              </div>
                              <span className="font-extrabold text-amber-400 text-xs">
                                Rs {c.balance?.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. 🖨️ PRINT BILL CARD */}
                    {msg.print_data && (
                      <div className="bg-[#27272a] border border-zinc-700 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-white block">
                              Invoice: {msg.print_data.invoice_number}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Total: Rs {msg.print_data.total_amount?.toLocaleString()} • Mode: {msg.print_data.payment_mode}
                            </span>
                          </div>
                          <button
                            onClick={() => handlePrintReceipt(msg.print_data)}
                            className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-full text-xs flex items-center gap-1 cursor-pointer shadow-sm transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 5. 🔒 ADMIN PIN PROMPT (SECURITY PROTECTED DELETION) */}
                    {msg.requires_pin && pinPromptMessageId === msg.id && (
                      <form onSubmit={handlePinSubmit} className="bg-amber-950/40 border border-amber-600/50 rounded-2xl p-3 space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Admin PIN Verification Required</span>
                        </div>
                        <p className="text-[11px] text-zinc-300">
                          Data delete karne ke liye Admin PIN (default: 1234) darj karein:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value)}
                            placeholder="Enter 4-digit PIN"
                            className="flex-1 bg-black/60 border border-amber-700/60 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      </form>
                    )}

                    {/* 6. 🛒 REAL PRODUCT CARDS (ONLY WHEN REAL ITEMS ARE MATCHED) */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="space-y-2.5 w-full">
                        {msg.items.map((item, idx) => {
                          const title = getItemDisplayName(item);
                          const price = item.unit_price ?? item.price ?? 0;
                          return (
                            <div
                              key={idx}
                              className="bg-[#27272a] border border-zinc-750/70 rounded-2xl p-3 space-y-2.5 transition hover:border-zinc-600"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-16 h-16 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center shadow-xs">
                                  <img
                                    src="/Screenshot 2026-09-26 210204.svg"
                                    alt={title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-xs text-white truncate">
                                    {item.quantity > 1 ? `${item.quantity}x ` : ''}{title}
                                  </h4>
                                  <p className="text-xs font-bold text-zinc-200 mt-1">
                                    Rs {price.toLocaleString()}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 mt-0.5">
                                    SKU: {item.sku} • {item.category || 'Fabric'}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleAddToCart(item)}
                                className="w-full py-2 bg-white hover:bg-zinc-200 active:scale-98 text-zinc-950 font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Add to cart</span>
                              </button>
                            </div>
                          );
                        })}

                        {msg.items.length > 1 && (
                          <button
                            onClick={() => handleAddAllToCart(msg.items!)}
                            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-zinc-700"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add all {msg.items.length} items to cart</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 💬 Typing Indicator Animation (Bouncing Dots) */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 px-1 animate-in fade-in">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                </div>
                <div className="flex items-center gap-1 bg-[#27272a] px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* Quick Suggestion Pills */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider px-1">
                Suggested Actions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPills.map((pill, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(pill.prompt)}
                    className="px-3 py-1.5 rounded-full bg-[#27272a] hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-750 text-xs font-medium transition cursor-pointer text-left hover:scale-102 active:scale-98"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Bottom Message Input Bar ─── */}
          <div className="p-3 bg-[#1c1c1e] border-t border-zinc-800/70 shrink-0">
            <div className="relative flex items-center bg-[#27272a] rounded-full px-4 py-1.5 border border-zinc-700/60 focus-within:border-zinc-400 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Message Bilal Cloth AI..."
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none pr-14 py-1.5 font-medium"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSpeech}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={isListening ? 'Listening...' : 'Voice input'}
                >
                  {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isProcessing}
                  className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 transition cursor-pointer hover:scale-110 active:scale-90"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
