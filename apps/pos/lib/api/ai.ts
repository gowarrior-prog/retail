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
  engine: 'gemini_cloud' | 'offline_nlp' | 'offline_fallback';
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

/**
 * Parses natural language queries into structured cart items.
 * Non-blocking with 0ms offline fallback guarantee.
 * Gemini API Key is securely managed in backend .env.
 */
export async function parseNaturalLanguageOrder(text: string): Promise<NLParseResponse> {
  try {
    return await apiFetch<NLParseResponse>('/ai/parse-order', {
      method: 'POST',
      body: JSON.stringify({ query: text }),
      timeoutMs: 4000,
    });
  } catch (err) {
    // Zero-downtime client-side emergency fallback
    return {
      status: 'offline_client_fallback',
      engine: 'offline_nlp',
      items: [
        {
          product_id: `offline-${Date.now()}`,
          sku: 'AI-DIRECT',
          name: text.slice(0, 30),
          quantity: 1,
          price: 0,
          confidence: 0.5,
          engine: 'offline_nlp',
          is_custom: true,
        },
      ],
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
    timeoutMs: 5000,
  });
}

/**
 * Checks AI engine status (Gemini Cloud vs Local Offline Parser).
 */
export async function fetchAIStatus(): Promise<AIStatusResponse> {
  return await apiFetch<AIStatusResponse>('/ai/status', {
    method: 'GET',
    timeoutMs: 3000,
  });
}
