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
} from 'lucide-react';
import { parseNaturalLanguageOrder, fetchAIStatus, NLOrderItem } from '@/lib/api/ai';
import { useCartStore } from '@/stores/useCartStore';
import { showCatalogToast } from '@/lib/toast';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text?: string;
  items?: NLOrderItem[];
  timestamp: string;
}

export default function AIManagerWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiEngine, setAiEngine] = useState<'gemini_cloud' | 'offline_nlp'>('gemini_cloud');

  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items: cartItems, addItem, addMultipleItems } = useCartStore();

  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Initial AI status & greeting
  useEffect(() => {
    fetchAIStatus()
      .then((status) => {
        setAiEngine(status.primary_engine);
      })
      .catch(() => {
        setAiEngine('offline_nlp');
      });

    setMessages([
      {
        id: 'msg-1',
        sender: 'ai',
        text: 'Assalam-o-Alaikum! Main Bilal Cloth ka AI Assistant hoon. Aap natural language (Urdu, Roman Urdu ya English) mein order bol ya likh sakte hain.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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

  const handleSendMessage = async (textToSend?: string) => {
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

    // Call Backend AI Order Parser
    try {
      const res = await parseNaturalLanguageOrder(text);
      if (res.engine) {
        setAiEngine(res.engine as any);
      }

      if (res.items && res.items.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: `Mujhe aapke order ke liye yeh ${res.items.length} items mile hain:`,
            items: res.items,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: 'Koi matching fabric product nahi mila. Barah-e-karam product ka naam ya SKU check karein.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'Order offline parser se process ho gaya.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
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

  const quickPills = [
    '2 cotton suits and 1 silk shirt',
    'do cotton suit aur aik silk dupatta',
    '5 meter cloth',
    'Cotton Latha',
    'Pure Boski',
  ];

  return (
    <>
      {/* 🚀 EXACT MATCH: Floating Pill Trigger Button in Bottom-Right Corner */}
      <div className="fixed bottom-5 right-5 z-50 select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center bg-black hover:bg-zinc-900 text-white rounded-full p-1.5 pr-4.5 shadow-2xl border border-zinc-800 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Bilal Cloth AI Assistant"
        >
          {/* White circle with black four-pointed sparkle icon (Exact match to screenshot) */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-sm mr-2.5 shrink-0">
            <Sparkles className="w-4.5 h-4.5 fill-black text-black" />
          </div>

          {/* Text label "Shop with AI" */}
          <span className="font-semibold text-xs tracking-wide text-zinc-100 group-hover:text-white">
            Shop with AI
          </span>
        </button>
      </div>

      {/* 🪟 EXACT MATCH: Dark Theme AI Assistant Window (Screenshot Replica) */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-[380px] max-w-[94vw] h-[590px] max-h-[85vh] bg-[#1c1c1e] text-white rounded-3xl shadow-2xl border border-zinc-800/80 flex flex-col font-sans overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* ─── Header ─── */}
          <div className="px-4 py-3 bg-[#1c1c1e] border-b border-zinc-800/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Circular white icon with sparkles */}
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shrink-0">
                <Sparkles className="w-4 h-4 fill-black text-black" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-white leading-tight">
                  Bilal Cloth AI
                </h3>
                <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                  {aiEngine === 'gemini_cloud' ? (
                    <>
                      <Zap className="w-2.5 h-2.5 text-emerald-400" /> Gemini Online
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
              {/* Shopping Cart button with counter badge */}
              <button
                className="relative p-1.5 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title={`Cart: ${totalCartCount} items`}
              >
                <ShoppingCart className="w-4 h-4" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black font-extrabold text-[9px] flex items-center justify-center">
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
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* User Message Bubble */}
                {msg.sender === 'user' && (
                  <div className="bg-white text-zinc-950 px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[85%] font-medium text-xs shadow-sm">
                    {msg.text}
                  </div>
                )}

                {/* AI Assistant Message Bubble & Product Cards */}
                {msg.sender === 'ai' && (
                  <div className="space-y-2.5 max-w-[100%] w-full">
                    {msg.text && (
                      <p className="text-zinc-300 text-xs leading-relaxed px-1">
                        {msg.text}
                      </p>
                    )}

                    {/* Render Product Cards (Exact match to screenshot!) */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="space-y-2.5 w-full">
                        {msg.items.map((item, idx) => {
                          const title = getItemDisplayName(item);
                          const price = item.unit_price ?? item.price ?? 0;
                          return (
                            <div
                              key={idx}
                              className="bg-[#27272a] border border-zinc-750/70 rounded-2xl p-3 space-y-2.5"
                            >
                              <div className="flex items-start gap-3">
                                {/* Square white image container */}
                                <div className="w-16 h-16 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center shadow-xs">
                                  <img
                                    src="/Screenshot 2026-09-26 210204.svg"
                                    alt={title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-xs text-white underline-offset-2 hover:underline truncate cursor-pointer">
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

                              {/* White pill "+ Add to cart" button (Exact match to screenshot!) */}
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="w-full py-2 bg-white hover:bg-zinc-200 active:scale-98 text-zinc-950 font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Add to cart</span>
                              </button>

                              <p className="text-[11px] text-zinc-400 leading-snug">
                                High-quality retail fabric from Bilal Cloth & Silk Center catalog.
                              </p>
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

            {isProcessing && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 px-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Bilal Cloth AI is analyzing...</span>
              </div>
            )}

            {/* Quick Suggestion Pills (Exact match to screenshot bottom chips!) */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider px-1">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPills.map((pill, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(pill)}
                    className="px-3 py-1.5 rounded-full bg-[#27272a] hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-750 text-xs font-medium transition cursor-pointer text-left"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Bottom Message Input (Exact match to screenshot!) ─── */}
          <div className="p-3 bg-[#1c1c1e] border-t border-zinc-800/70 shrink-0">
            <div className="relative flex items-center bg-[#27272a] rounded-full px-4 py-1.5 border border-zinc-700/60 focus-within:border-zinc-500 transition">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="Message Bilal Cloth AI..."
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none pr-14 py-1 font-medium"
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
                  className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
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
