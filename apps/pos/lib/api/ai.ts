import { apiFetch } from './client';

export interface NLOrderItem {
  product_id: string;
  sku: string;
  name: string;
  category?: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  cost_price?: number;
  confidence: number;
  matched_from?: string;
  engine?: 'gemini_cloud' | 'offline_nlp';
  is_custom?: boolean;
}

export interface NLParseResponse {
  status: string;
  engine: 'gemini_cloud' | 'offline_nlp';
  items: NLOrderItem[];
  message: string;
}

export interface CopilotInsight {
  type: 'sales' | 'bestseller' | 'restock' | 'khata';
  title: string;
  description: string;
  icon: string;
}

export interface CopilotResponse {
  status: string;
  engine: 'gemini_cloud' | 'offline_rules';
  data: {
    today_revenue: number;
    today_bills_count: number;
    total_bills_all_time: number;
    total_revenue_all_time: number;
    top_selling_products: Array<{ name: string; sold_qty: number }>;
    low_stock_products: Array<{ name: string; stock: number; sku: string; category: string }>;
    khata_outstanding: number;
    khata_customers_count: number;
  };
  insights: CopilotInsight[];
  generated_at: string;
}

export interface AIStatusResponse {
  status: string;
  has_gemini_key: boolean;
  primary_engine: 'gemini_cloud' | 'offline_nlp';
  fallback_engine: 'offline_nlp';
  offline_ready: boolean;
  supported_languages: string[];
}

export interface AIChatResult {
  status: string;
  engine: 'gemini_cloud' | 'offline_nlp' | 'offline_rules';
  intent: 'chat' | 'analytics' | 'trends' | 'order' | 'ledger' | 'print' | 'delete';
  reply_text: string;
  language: 'english' | 'roman_urdu' | 'urdu';
  items: NLOrderItem[];
  analytics_data?: {
    today_revenue: number;
    today_bills_count: number;
    total_bills_all_time: number;
    total_revenue_all_time: number;
    top_selling_products: Array<{ name: string; sold_qty: number }>;
    low_stock_products: Array<{ name: string; stock: number; sku: string; category: string }>;
    khata_outstanding: number;
    khata_customers_count: number;
  };
  ledger_data?: {
    customers: Array<{ id: string; name: string; phone: string; balance: number; updated_at: string }>;
    total_due: number;
    count: number;
  };
  print_data?: {
    id: string;
    invoice_number: string;
    total_amount: number;
    payment_mode: string;
    customer_phone: string;
    items: Array<any>;
    created_at: string;
  };
  requires_pin?: boolean;
  action_executed?: string | null;
  execution_time_ms?: number;
}

/**
 * Unified Conversational AI Assistant:
 * Supports chat, sales analytics, market trends, ledger, receipt printing, and secure deletions.
 */
export async function chatWithAI(
  message: string,
  history: Array<{ sender: string; text: string }> = [],
  adminPin?: string
): Promise<AIChatResult> {
  try {
    return await apiFetch<AIChatResult>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history,
        admin_pin: adminPin || undefined,
      }),
      timeoutMs: 25000,
    });
  } catch (err: any) {
    // Offline emergency fallback without generating fake products
    const lower = message.toLowerCase();
    const isEnglish = /\b(hi|hello|analytics|sales|trends|delete|how)\b/.test(lower);
    
    return {
      status: 'offline_client_fallback',
      engine: 'offline_nlp',
      intent: 'chat',
      language: isEnglish ? 'english' : 'roman_urdu',
      reply_text: isEnglish
        ? "I am currently in local offline mode. I can still assist with local orders, catalog searches, and receipts."
        : "Main is waqt local offline mode mein hoon. Aap local orders aur billing ba-asani chala sakte hain.",
      items: [], // Never generate fake products on chat!
      requires_pin: false,
    };
  }
}

/**
 * Parses natural language queries into structured cart items.
 */
export async function parseNaturalLanguageOrder(text: string): Promise<NLParseResponse> {
  try {
    return await apiFetch<NLParseResponse>('/ai/parse-order', {
      method: 'POST',
      body: JSON.stringify({ query: text }),
      timeoutMs: 25000,
    });
  } catch (err) {
    return {
      status: 'offline_client_fallback',
      engine: 'offline_nlp',
      items: [], // Clean empty items list, never invent fake prices!
      message: 'Client-side fallback active.',
    };
  }
}

/**
 * Fetches AI Sales Copilot insights and metrics from SQLite database.
 */
export async function fetchCopilotInsights(): Promise<CopilotResponse> {
  return await apiFetch<CopilotResponse>('/ai/copilot-insights', {
    method: 'GET',
    timeoutMs: 15000,
  });
}

/**
 * Checks AI engine status (Gemini Cloud vs Local Offline Parser).
 */
export async function fetchAIStatus(): Promise<AIStatusResponse> {
  return await apiFetch<AIStatusResponse>('/ai/status', {
    method: 'GET',
    timeoutMs: 10000,
  });
}
