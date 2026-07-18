// Mock data for the Revenue Agent module.
// Reframed for SMB product commerce — customers arrive from Instagram, WhatsApp,
// Website Chat, Facebook Messenger, Email, and returning customer flows.
import type { AIAgent, RevenueMetrics } from "@/types/revenue";
import type { CommerceCustomer, CustomerSource, CommerceAgent, ActivityItem } from "@/types/commerce";

const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const sec = 1_000;
const m = 60_000;
const h = 3_600_000;
const d = 86_400_000;

// ── Customer sources ──────────────────────────────────────────────────────────

export const mockCustomerSources: CustomerSource[] = [
  { id: "src_instagram",  label: "Instagram DM",       channel: "instagram",    count: 34, unread: 8,  conversionPct: 12 },
  { id: "src_whatsapp",   label: "WhatsApp",            channel: "whatsapp",     count: 19, unread: 5,  conversionPct: 18 },
  { id: "src_website",    label: "Website Chat",        channel: "website_chat", count: 12, unread: 2,  conversionPct: 9  },
  { id: "src_messenger",  label: "Facebook Messenger",  channel: "messenger",    count: 6,  unread: 1,  conversionPct: 7  },
  { id: "src_email",      label: "Email",               channel: "email",        count: 8,  unread: 3,  conversionPct: 22 },
  { id: "src_returning",  label: "Returning Customers", channel: "returning",    count: 21, unread: 0,  conversionPct: 41 },
  { id: "src_abandoned",  label: "Abandoned Carts",     channel: "abandoned",    count: 15, unread: 0,  conversionPct: 28 },
];

// ── Live customer queue ───────────────────────────────────────────────────────

export const mockCommerceCustomers: CommerceCustomer[] = [
  {
    id: "cc_01",
    name: "Sophia R.",
    avatarHue: 210,
    channel: "instagram",
    intent: "Looking for running sneakers",
    leadScore: 92,
    orderValueCents: 320_000,
    status: "talking",
    isReturning: false,
    previousOrders: 1,
    lifetimeValueCents: 580_000,
    favoriteCategories: ["Footwear", "Sportswear"],
    recentPurchase: "White sneakers — 3 weeks ago",
    abandonedCart: "Nike Air Zoom — ₹3,200",
    preferredPayment: "UPI",
    loyaltyTier: "silver",
    lastSeen: ago(4 * m),
    buyingSignals: [
      { label: "Viewed same product 5×", weight: 0.95 },
      { label: "Added to cart", weight: 0.91 },
      { label: "Asked delivery question", weight: 0.89 },
      { label: "Viewed reviews", weight: 0.82 },
      { label: "Returning customer", weight: 0.78 },
    ],
    journeyStages: [
      { key: "arrive",   label: "Instagram DM",             done: true,  active: false },
      { key: "identify", label: "AI identified customer",   done: true,  active: false },
      { key: "history",  label: "Retrieved purchase history",done: true, active: false },
      { key: "intent",   label: "Detected buying intent",   done: true,  active: false },
      { key: "recommend","label": "Recommended 3 products",  done: true,  active: false },
      { key: "discount", label: "Applied loyalty discount",  done: true,  active: false },
      { key: "checkout", label: "Checkout link generated",  done: false, active: true  },
      { key: "payment",  label: "Payment received",         done: false, active: false },
      { key: "order",    label: "Order created",            done: false, active: false },
      { key: "followup", label: "Follow-up scheduled",      done: false, active: false },
    ],
    aiRecommendation: {
      title: "Recommend Running Shoes Bundle",
      confidence: 94,
      reason: "Bought sportswear 3 weeks ago · viewed running shoes 5× · added to cart · loyalty discount eligible",
      expectedSaleCents: 285_000,
      products: ["Nike Air Zoom Pegasus", "Running Socks Pack", "Shoe Deodoriser"],
    },
    updatedAt: ago(4 * m),
  },
  {
    id: "cc_02",
    name: "Marcus O.",
    avatarHue: 145,
    channel: "whatsapp",
    intent: "Order tracking",
    leadScore: 65,
    orderValueCents: 0,
    status: "resolved",
    isReturning: true,
    previousOrders: 4,
    lifetimeValueCents: 1_240_000,
    favoriteCategories: ["Electronics", "Accessories"],
    recentPurchase: "Wireless earbuds — 1 week ago",
    abandonedCart: undefined,
    preferredPayment: "Credit Card",
    loyaltyTier: "gold",
    lastSeen: ago(28 * m),
    buyingSignals: [
      { label: "Repeat buyer", weight: 0.88 },
      { label: "High LTV customer", weight: 0.72 },
    ],
    journeyStages: [
      { key: "arrive",   label: "WhatsApp",                  done: true,  active: false },
      { key: "identify", label: "AI identified customer",    done: true,  active: false },
      { key: "history",  label: "Retrieved purchase history",done: true,  active: false },
      { key: "intent",   label: "Detected: order tracking",  done: true,  active: false },
      { key: "resolve",  label: "Sent tracking update",      done: true,  active: false },
      { key: "followup", label: "Upsell opportunity noted",  done: true,  active: false },
    ],
    aiRecommendation: {
      title: "Suggest Protective Case Upsell",
      confidence: 71,
      reason: "Bought earbuds 1 week ago — protective case is top accessory for this product",
      expectedSaleCents: 89_000,
      products: ["Premium Earbuds Case", "Cleaning Kit"],
    },
    updatedAt: ago(28 * m),
  },
  {
    id: "cc_03",
    name: "Elena K.",
    avatarHue: 280,
    channel: "website_chat",
    intent: "Looking for headphones",
    leadScore: 88,
    orderValueCents: 640_000,
    status: "recommendation_sent",
    isReturning: false,
    previousOrders: 0,
    lifetimeValueCents: 0,
    favoriteCategories: ["Electronics"],
    recentPurchase: undefined,
    abandonedCart: "Sony WH-1000XM5 — ₹29,990",
    preferredPayment: "Net Banking",
    loyaltyTier: "standard",
    lastSeen: ago(8 * m),
    buyingSignals: [
      { label: "Abandoned cart with headphones", weight: 0.94 },
      { label: "Viewed 3 headphone models", weight: 0.88 },
      { label: "Checked delivery options", weight: 0.76 },
      { label: "Read 12 reviews", weight: 0.71 },
    ],
    journeyStages: [
      { key: "arrive",    label: "Website Chat",             done: true,  active: false },
      { key: "identify",  label: "AI identified visitor",    done: true,  active: false },
      { key: "history",   label: "Retrieved browsing history",done: true, active: false },
      { key: "intent",    label: "Detected: headphone search",done: true, active: false },
      { key: "recommend", label: "Recommended 3 models",     done: true,  active: false },
      { key: "checkout",  label: "Checkout link sent",       done: false, active: true  },
      { key: "payment",   label: "Awaiting payment",         done: false, active: false },
    ],
    aiRecommendation: {
      title: "Recommend Sony WH-1000XM5 + Bundle",
      confidence: 88,
      reason: "Abandoned Sony cart · viewed 3 models · read 12 reviews — high purchase intent, offer free case with purchase",
      expectedSaleCents: 320_000,
      products: ["Sony WH-1000XM5", "Carrying Case (free)", "3-Year Warranty"],
    },
    updatedAt: ago(8 * m),
  },
  {
    id: "cc_04",
    name: "Priya A.",
    avatarHue: 46,
    channel: "returning",
    intent: "Interested in new arrivals",
    leadScore: 95,
    orderValueCents: 280_000,
    status: "checkout_pending",
    isReturning: true,
    previousOrders: 7,
    lifetimeValueCents: 2_480_000,
    favoriteCategories: ["Kurtas", "Ethnic Wear", "Accessories"],
    recentPurchase: "Embroidered kurta — 2 weeks ago",
    abandonedCart: undefined,
    preferredPayment: "UPI",
    loyaltyTier: "platinum",
    lastSeen: ago(2 * m),
    buyingSignals: [
      { label: "Platinum loyalty member", weight: 0.97 },
      { label: "Buys every 2 weeks on avg", weight: 0.94 },
      { label: "Opened new arrivals email", weight: 0.91 },
      { label: "Viewed 4 new items", weight: 0.87 },
      { label: "Added 2 items to wishlist", weight: 0.82 },
    ],
    journeyStages: [
      { key: "arrive",    label: "Returning customer",           done: true,  active: false },
      { key: "identify",  label: "Recognised: Priya (Platinum)", done: true,  active: false },
      { key: "history",   label: "Retrieved 7 order history",    done: true,  active: false },
      { key: "intent",    label: "Detected: new arrivals browse",done: true,  active: false },
      { key: "recommend", label: "Personalised 5 products",      done: true,  active: false },
      { key: "discount",  label: "Applied Platinum 10% off",     done: true,  active: false },
      { key: "checkout",  label: "Checkout link opened",         done: false, active: true  },
      { key: "payment",   label: "Awaiting payment",             done: false, active: false },
      { key: "order",     label: "Order creation pending",       done: false, active: false },
    ],
    aiRecommendation: {
      title: "Personalised New Arrivals — Ethnic Wear",
      confidence: 96,
      reason: "Platinum member · buys every 2 weeks · opened new arrivals email · added 2 wishlist items · 10% loyalty discount applied",
      expectedSaleCents: 252_000,
      products: ["Floral Anarkali Suit", "Embroidered Dupatta", "Jhumka Earrings"],
    },
    updatedAt: ago(2 * m),
  },
  {
    id: "cc_05",
    name: "Liam T.",
    avatarHue: 22,
    channel: "instagram",
    intent: "Asking about product availability",
    leadScore: 61,
    orderValueCents: 145_000,
    status: "thinking",
    isReturning: false,
    previousOrders: 0,
    lifetimeValueCents: 0,
    favoriteCategories: ["Streetwear", "Caps"],
    recentPurchase: undefined,
    abandonedCart: undefined,
    preferredPayment: undefined,
    loyaltyTier: "standard",
    lastSeen: ago(15 * m),
    buyingSignals: [
      { label: "Liked 6 posts", weight: 0.72 },
      { label: "Asked about sizes", weight: 0.68 },
      { label: "Checked DM twice", weight: 0.61 },
    ],
    journeyStages: [
      { key: "arrive",    label: "Instagram DM",            done: true,  active: false },
      { key: "identify",  label: "New visitor identified",  done: true,  active: false },
      { key: "intent",    label: "Detected: availability",  done: true,  active: false },
      { key: "recommend", label: "Sending recommendations", done: false, active: true  },
    ],
    aiRecommendation: {
      title: "Recommend Streetwear Drop + Size Guide",
      confidence: 61,
      reason: "New visitor · liked 6 posts · asked about sizes — first purchase opportunity, offer new customer discount",
      expectedSaleCents: 145_000,
      products: ["Oversized Graphic Tee", "Cargo Shorts", "Snapback Cap"],
    },
    updatedAt: ago(15 * m),
  },
];

// ── Commerce AI agents ────────────────────────────────────────────────────────

export const mockCommerceAgents: CommerceAgent[] = [
  { id: "ca_sales",      name: "Sales Agent",          status: "active",     task: "Talking with Sophia — sending checkout link",  confidence: 94, latencyMs: 280 },
  { id: "ca_reco",       name: "Recommendation Agent", status: "processing", task: "Finding best products for Elena's search",     confidence: 88, latencyMs: 420 },
  { id: "ca_inventory",  name: "Inventory Agent",      status: "active",     task: "Checking stock for Sony WH-1000XM5",          confidence: 99, latencyMs: 95  },
  { id: "ca_pricing",    name: "Pricing Agent",        status: "thinking",   task: "Calculating loyalty discount for Priya",      confidence: 91, latencyMs: 340 },
  { id: "ca_order",      name: "Order Agent",          status: "idle",       task: undefined,                                     confidence: 97, latencyMs: 120 },
  { id: "ca_learning",   name: "Learning Engine",      status: "processing", task: "Updating product recommendations from 3 orders", confidence: 85, latencyMs: 510 },
];

// ── Live AI activity feed ─────────────────────────────────────────────────────

export const mockActivityItems: ActivityItem[] = [
  { id: "act_01", text: "Generated checkout link for Sophia",     timeAgo: ago(2 * sec)   },
  { id: "act_02", text: "Recommended running bundle · 3 items",   timeAgo: ago(10 * sec)  },
  { id: "act_03", text: "Recovered abandoned cart — Elena K.",    timeAgo: ago(35 * sec)  },
  { id: "act_04", text: "Follow-up message sent to Marcus",       timeAgo: ago(1 * m)     },
  { id: "act_05", text: "Order ORD-8821 completed · ₹2,850",      timeAgo: ago(3 * m)     },
  { id: "act_06", text: "Platinum discount applied for Priya",    timeAgo: ago(4 * m)     },
  { id: "act_07", text: "New Instagram DM — Liam asking about caps", timeAgo: ago(6 * m)  },
  { id: "act_08", text: "Inventory confirmed: Sony WH-1000XM5 ×4 in stock", timeAgo: ago(8 * m) },
];

// ── Commerce pipeline stages ──────────────────────────────────────────────────

export const COMMERCE_PIPELINE = [
  { key: "arrive",    label: "Customer Arrives"         },
  { key: "identify",  label: "Identify Customer"        },
  { key: "history",   label: "Retrieve Purchase History"},
  { key: "intent",    label: "Analyse Intent"           },
  { key: "recommend", label: "Recommend Products"       },
  { key: "inventory", label: "Check Inventory"          },
  { key: "discount",  label: "Calculate Discount"       },
  { key: "checkout",  label: "Generate Checkout Link"   },
  { key: "payment",   label: "Payment Received"         },
  { key: "order",     label: "Order Created"            },
  { key: "followup",  label: "Follow-up Scheduled"      },
  { key: "learn",     label: "Learning Updated"         },
];

// ── Re-exports kept for compatibility ─────────────────────────────────────────

export const mockLeads = [] as never[];

export const mockConversations = [] as never[];

export const mockAIAgents: AIAgent[] = [
  { id: "agent_support",    name: "Support Agent",   type: "support",   status: "active",     currentTask: "Resolving order delay — Case #CSR-0089", latencyMs: 312, confidence: 0.91, tasksCompleted: 847,  updatedAt: ago(15 * m) },
  { id: "agent_revenue",    name: "Revenue Agent",   type: "revenue",   status: "processing", currentTask: "Generating checkout for Sophia R.",       latencyMs: 480, confidence: 0.87, tasksCompleted: 124,  updatedAt: ago(2 * m)  },
  { id: "agent_research",   name: "Research Agent",  type: "research",  status: "thinking",   currentTask: "Enriching profile for Elena K.",          latencyMs: 620, confidence: 0.79, tasksCompleted: 203,  updatedAt: ago(8 * m)  },
  { id: "agent_policy",     name: "Policy Agent",    type: "policy",    status: "active",     currentTask: "Evaluating REFUND-30 for 3 cases",        latencyMs: 185, confidence: 0.96, tasksCompleted: 1203, updatedAt: ago(3 * m)  },
  { id: "agent_risk",       name: "Risk Agent",      type: "risk",      status: "idle",       currentTask: undefined,                                  latencyMs: 240, confidence: 0.88, tasksCompleted: 568,  updatedAt: ago(22 * m) },
  { id: "agent_finance",    name: "Finance Agent",   type: "finance",   status: "active",     currentTask: "Pricing discount for Priya (Platinum)",   latencyMs: 390, confidence: 0.93, tasksCompleted: 89,   updatedAt: ago(6 * m)  },
  { id: "agent_compliance", name: "Compliance",      type: "compliance",status: "idle",       currentTask: undefined,                                  latencyMs: 275, confidence: 0.97, tasksCompleted: 312,  updatedAt: ago(18 * m) },
  { id: "agent_learning",   name: "Learning Engine", type: "learning",  status: "processing", currentTask: "Indexing 3 new product conversions",      latencyMs: 510, confidence: 0.84, tasksCompleted: 2841, updatedAt: ago(1 * m)  },
  { id: "agent_execution",  name: "Execution Engine",type: "execution", status: "active",     currentTask: "Executing checkout — idempotency ref_a3f9",latencyMs: 128,confidence: 0.99, tasksCompleted: 4312, updatedAt: ago(45)     },
];

export const mockRevenueMetrics: RevenueMetrics = {
  todaysRevenueCents:       186_500_00,
  revenueProtectedCents:    94_200_00,
  autoClosedDeals:          19,
  autoResolvedCases:        67,
  humanOverrides:           3,
  conversionRate:           0.213,
  avgAIConfidence:          0.91,
  policyCompliance:         0.97,
  activeLeads:              47,
  pipelineValueCents:       295_200_00,
  wonThisMonthCents:        384_000_00,
};
