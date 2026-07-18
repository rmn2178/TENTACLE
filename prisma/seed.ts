/**
 * Prisma seed script — populates the database with demo data for local development and demos.
 * Run with: `bun run prisma/seed.ts` (or `bun run db:seed`)
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const db = new PrismaClient();

// ── Demo data (mirrors the previous mockData.ts, now persisted to DB) ─────────

const customers = [
  { id: "cus_01", name: "Amelia Hart", email: "amelia.hart@gmail.com", phone: "+1 415 555 0142", avatarHue: 152, tier: "gold", lifetimeValue: 4820.5, orderCount: 14, createdAt: new Date("2023-03-12T09:14:00Z") },
  { id: "cus_02", name: "Daniel Okafor", email: "daniel.okafor@outlook.com", phone: "+1 212 555 0188", avatarHue: 24, tier: "platinum", lifetimeValue: 11920.0, orderCount: 31, createdAt: new Date("2022-08-04T14:20:00Z") },
  { id: "cus_03", name: "Sora Tanaka", email: "sora.tanaka@protonmail.com", phone: "+81 90 5555 0123", avatarHue: 220, tier: "silver", lifetimeValue: 1640.0, orderCount: 6, createdAt: new Date("2024-01-22T11:30:00Z") },
  { id: "cus_04", name: "Priya Nair", email: "priya.nair@gmail.com", phone: "+44 7700 900123", avatarHue: 290, tier: "standard", lifetimeValue: 320.75, orderCount: 2, createdAt: new Date("2024-09-30T18:45:00Z") },
  { id: "cus_05", name: "Marcus Bell", email: "marcus.bell@yahoo.com", phone: "+1 312 555 0177", avatarHue: 12, tier: "gold", lifetimeValue: 6210.0, orderCount: 18, createdAt: new Date("2023-06-18T08:00:00Z") },
  { id: "cus_06", name: "Linnea Sjöberg", email: "linnea.s@icloud.com", phone: "+46 70 555 1234", avatarHue: 195, tier: "silver", lifetimeValue: 2140.0, orderCount: 8, createdAt: new Date("2023-11-02T13:10:00Z") },
  { id: "cus_07", name: "Ezra Cohen", email: "ezra.cohen@gmail.com", phone: "+1 305 555 0144", avatarHue: 48, tier: "platinum", lifetimeValue: 9410.0, orderCount: 27, createdAt: new Date("2022-05-14T10:25:00Z") },
  { id: "cus_08", name: "Mira Patel", email: "mira.patel@gmail.com", phone: "+1 646 555 0190", avatarHue: 320, tier: "standard", lifetimeValue: 480.0, orderCount: 3, createdAt: new Date("2024-07-19T16:30:00Z") },
];

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000);
const future = (n: number) => new Date(now + n * 86400000);

const orders = [
  { id: "ord_01", orderNumber: "#A1023-4471", customerId: "cus_01", status: "delayed", items: JSON.stringify([{ sku: "AC-SHF-OLV", name: "Aria Cotton Sheet Set — Olive Queen", qty: 1, priceCents: 18900, imageHue: 110 }, { sku: "AC-PIL-OLV", name: "Aria Pillowcase Pair — Olive", qty: 2, priceCents: 3200, imageHue: 110 }]), totalCents: 25300, currency: "USD", placedAt: days(12), shippedAt: days(8), deliveredAt: null, eta: days(-2), shippingAddress: "148 Hayes St, San Francisco, CA 94102" },
  { id: "ord_02", orderNumber: "#A1023-4472", customerId: "cus_02", status: "delivered", items: JSON.stringify([{ sku: "NV-HDP-BLK", name: "Nimbus Wireless Headphones — Black", qty: 1, priceCents: 32900, imageHue: 220 }]), totalCents: 32900, currency: "USD", placedAt: days(20), shippedAt: days(17), deliveredAt: days(13), eta: null, shippingAddress: "55 Hudson Yds, New York, NY 10001" },
  { id: "ord_03", orderNumber: "#A1023-4473", customerId: "cus_02", status: "delivered", items: JSON.stringify([{ sku: "LX-LMP-BRS", name: "Lumen Brass Table Lamp", qty: 1, priceCents: 14500, imageHue: 38 }]), totalCents: 14500, currency: "USD", placedAt: days(35), shippedAt: days(32), deliveredAt: days(28), eta: null, shippingAddress: "55 Hudson Yds, New York, NY 10001" },
  { id: "ord_04", orderNumber: "#A1023-4474", customerId: "cus_03", status: "shipped", items: JSON.stringify([{ sku: "KR-MUG-SET", name: "Kinta Stoneware Mug Set of 4", qty: 1, priceCents: 5800, imageHue: 28 }]), totalCents: 5800, currency: "USD", placedAt: days(4), shippedAt: days(2), deliveredAt: null, eta: future(2), shippingAddress: "3-14-2 Shibuya, Tokyo 150-0002" },
  { id: "ord_05", orderNumber: "#A1023-4475", customerId: "cus_04", status: "delivered", items: JSON.stringify([{ sku: "WD-CST-OAK", name: "Woven Oak Floor Basket", qty: 1, priceCents: 7600, imageHue: 80 }]), totalCents: 7600, currency: "USD", placedAt: days(45), shippedAt: days(42), deliveredAt: days(38), eta: null, shippingAddress: "12 Notting Hill Gate, London W11 3HX" },
  { id: "ord_06", orderNumber: "#A1023-4476", customerId: "cus_05", status: "delivered", items: JSON.stringify([{ sku: "AL-BTL-500", name: "Atlas Insulated Bottle 500ml — Steel", qty: 2, priceCents: 2800, imageHue: 210 }, { sku: "AL-BAG-TOTE", name: "Atlas Canvas Tote — Sand", qty: 1, priceCents: 4500, imageHue: 40 }]), totalCents: 10100, currency: "USD", placedAt: days(8), shippedAt: days(6), deliveredAt: days(3), eta: null, shippingAddress: "820 W Randolph St, Chicago, IL 60607" },
  { id: "ord_07", orderNumber: "#A1023-4477", customerId: "cus_06", status: "shipped", items: JSON.stringify([{ sku: "PL-CHA-BLK", name: "Plein Lounge Chair — Black Ash", qty: 1, priceCents: 48900, imageHue: 28 }]), totalCents: 48900, currency: "USD", placedAt: days(6), shippedAt: days(3), deliveredAt: null, eta: future(4), shippingAddress: "Storgatan 22, 114 51 Stockholm" },
  { id: "ord_08", orderNumber: "#A1023-4478", customerId: "cus_07", status: "delivered", items: JSON.stringify([{ sku: "OS-RUG-9x12", name: "Osen Wool Rug 9x12 — Ivory", qty: 1, priceCents: 89500, imageHue: 60 }]), totalCents: 89500, currency: "USD", placedAt: days(15), shippedAt: days(11), deliveredAt: days(7), eta: null, shippingAddress: "1100 Brickell Bay Dr, Miami, FL 33131" },
  { id: "ord_09", orderNumber: "#A1023-4479", customerId: "cus_08", status: "placed", items: JSON.stringify([{ sku: "FL-VAS-CLR", name: "Folio Glass Vase — Clear", qty: 1, priceCents: 4200, imageHue: 200 }]), totalCents: 4200, currency: "USD", placedAt: days(1), shippedAt: null, deliveredAt: null, eta: future(5), shippingAddress: "220 W 19th St, New York, NY 10011" },
  { id: "ord_10", orderNumber: "#A1023-4480", customerId: "cus_01", status: "delivered", items: JSON.stringify([{ sku: "AC-DVT-OLV", name: "Aria Duvet Cover — Olive King", qty: 1, priceCents: 21900, imageHue: 110 }]), totalCents: 21900, currency: "USD", placedAt: days(60), shippedAt: days(57), deliveredAt: days(53), eta: null, shippingAddress: "148 Hayes St, San Francisco, CA 94102" },
];

const policies = [
  { id: "pol_01", code: "REFUND-30", title: "30-day refund window", category: "refund", description: "Items are eligible for a full refund within 30 days of delivery, provided they are unused and in original packaging.", rules: JSON.stringify([{ field: "days_since_delivery", op: "lte", value: 30 }]), autoResolve: true, weight: 10 },
  { id: "pol_02", code: "REFUND-LOWVAL", title: "Auto-refund under $25", category: "refund", description: "Refund requests for orders under $25 may be auto-issued without manager approval to reduce customer friction.", rules: JSON.stringify([{ field: "order_total", op: "lte", value: 2500 }]), autoResolve: true, weight: 9 },
  { id: "pol_03", code: "RETURN-ELIG-90", title: "Return eligibility — 90 days", category: "return", description: "Most categories are returnable within 90 days. Final-sale, personal care, and customized items are excluded.", rules: JSON.stringify([{ field: "days_since_delivery", op: "lte", value: 90 }]), autoResolve: true, weight: 7 },
  { id: "pol_04", code: "DAMAGE-FULL", title: "Damaged in transit — full replacement", category: "damaged", description: "If an item arrives damaged, the customer is entitled to a full replacement or refund at their preference. Photographic evidence is requested but not blocking.", rules: JSON.stringify([{ field: "damage_reported", op: "eq", value: "true" }]), autoResolve: true, weight: 9 },
  { id: "pol_05", code: "WRONG-PRODUCT", title: "Wrong product received", category: "general", description: "When the wrong item is shipped, a prepaid return label is issued and the correct item is dispatched within 24h at no cost.", rules: JSON.stringify([{ field: "wrong_product", op: "eq", value: "true" }]), autoResolve: true, weight: 8 },
  { id: "pol_06", code: "CANCEL-PRE-SHIP", title: "Cancellation before shipment", category: "cancellation", description: "Orders that have not yet shipped can be cancelled immediately with a full refund. Once shipped, the order must be processed as a return on delivery.", rules: JSON.stringify([{ field: "order_status", op: "eq", value: "placed" }]), autoResolve: true, weight: 8 },
  { id: "pol_07", code: "ADDR-PRE-SHIP", title: "Address correction before shipment", category: "general", description: "Shipping address may be corrected up to the moment the order is handed to the carrier. After pickup, the customer must contact the carrier directly.", rules: JSON.stringify([{ field: "order_status", op: "eq", value: "placed" }]), autoResolve: true, weight: 7 },
  { id: "pol_08", code: "SHIP-DELAY-3D", title: "Delayed shipment — 3+ days", category: "shipping", description: "If a shipment is delayed by more than 3 days past its original ETA, the customer is offered expedited shipping on the next order and a $10 store credit.", rules: JSON.stringify([{ field: "days_late", op: "gte", value: 3 }]), autoResolve: true, weight: 6 },
  { id: "pol_09", code: "ESCALATE-HV-CASE", title: "High-value order disputes — escalate", category: "general", description: "Disputes on orders above $500 require human review before any financial action is taken, regardless of policy eligibility.", rules: JSON.stringify([{ field: "order_total", op: "gte", value: 50000 }]), autoResolve: false, weight: 10 },
  { id: "pol_10", code: "ESCALATE-FURIOUS", title: "Furious sentiment — escalate", category: "general", description: "When customer sentiment is detected as 'furious', or the message contains threats of chargeback or legal action, escalate to a senior agent immediately.", rules: JSON.stringify([{ field: "sentiment", op: "eq", value: "furious" }]), autoResolve: false, weight: 10 },
];

const cases = [
  { id: "cas_01", caseNumber: "CSE-2024-0142", customerId: "cus_01", orderId: "ord_01", channel: "chat", subject: "Order still hasn't arrived", message: "Hi, my order #A1023-4471 was supposed to arrive 2 days ago and tracking hasn't updated in 4 days. Can someone tell me what's going on? I really need these sheets before guests arrive this weekend.", status: "new", createdAt: new Date(now - 38 * 60000), updatedAt: new Date(now - 38 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_02", caseNumber: "CSE-2024-0143", customerId: "cus_02", orderId: "ord_02", channel: "email", subject: "Headphones arrived damaged", message: "The box looked fine on the outside but the headphones have a dent on the left cup. I'd like a replacement please, I paid $329 for these.", status: "new", createdAt: new Date(now - 92 * 60000), updatedAt: new Date(now - 92 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_03", caseNumber: "CSE-2024-0144", customerId: "cus_03", orderId: "ord_04", channel: "whatsapp", subject: "Wrong color mug set", message: "I ordered the Kinta mug set in sand but I received blue ones. Order #A1023-4474. Please send the correct color.", status: "new", createdAt: new Date(now - 15 * 60000), updatedAt: new Date(now - 15 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_04", caseNumber: "CSE-2024-0145", customerId: "cus_04", orderId: "ord_05", channel: "email", subject: "Refund request — basket", message: "Hi, I'd like to return the Woven Oak Floor Basket for a refund. It doesn't fit the space I had in mind. Order #A1023-4475.", status: "new", createdAt: new Date(now - 220 * 60000), updatedAt: new Date(now - 220 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_05", caseNumber: "CSE-2024-0146", customerId: "cus_05", orderId: "ord_06", channel: "chat", subject: "Need to cancel bottle order", message: "Please cancel my order #A1023-4476 — I found the same bottles cheaper elsewhere. Order was just placed.", status: "new", createdAt: new Date(now - 4 * 60000), updatedAt: new Date(now - 4 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_06", caseNumber: "CSE-2024-0147", customerId: "cus_06", orderId: "ord_07", channel: "whatsapp", subject: "Wrong shipping address", message: "I just realized I sent my chair to my old address. Order #A1023-4477. Can you update the address before it's delivered? It hasn't shipped yet from what I can see.", status: "new", createdAt: new Date(now - 9 * 60000), updatedAt: new Date(now - 9 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_07", caseNumber: "CSE-2024-0148", customerId: "cus_07", orderId: "ord_08", channel: "email", subject: "I'm furious — ruined my living room", message: "The rug I paid almost $900 for arrived with a huge tear down the middle. I have guests coming tomorrow. This is unacceptable. If this isn't fixed immediately I'm doing a chargeback and never shopping here again.", status: "new", createdAt: new Date(now - 52 * 60000), updatedAt: new Date(now - 52 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  { id: "cas_08", caseNumber: "CSE-2024-0149", customerId: "cus_08", orderId: "ord_09", channel: "chat", subject: "Can I return the vase if I don't like it?", message: "Thinking about the Folio vase but want to know — if I don't love it in person, can I return it? How long do I have?", status: "new", createdAt: new Date(now - 2 * 60000), updatedAt: new Date(now - 2 * 60000), slaDueAt: new Date(now + 4 * 3600000) },
  // Pre-resolved historical cases for analytics
  { id: "cas_h1", caseNumber: "CSE-2024-0131", customerId: "cus_01", orderId: "ord_10", channel: "chat", subject: "Quick return question", message: "Can I return the duvet cover if it doesn't match?", intent: "return_eligibility", sentiment: "neutral", sentimentScore: 0.1, urgency: "low", confidence: 0.94, automationSafe: true, status: "resolved", responseDraft: "Hi Amelia — yes, our return window is 90 days from delivery. Just initiate the return from your order page and we'll send a prepaid label.", createdAt: new Date(now - 3 * 86400000), updatedAt: new Date(now - 3 * 86400000 + 4 * 60000), resolvedAt: new Date(now - 3 * 86400000 + 4 * 60000), slaDueAt: new Date(now - 3 * 86400000 + 4 * 3600000) },
  { id: "cas_h2", caseNumber: "CSE-2024-0132", customerId: "cus_05", orderId: "ord_06", channel: "chat", subject: "Wrong item sent", message: "I got two bottles instead of the tote bag I ordered.", intent: "wrong_product", sentiment: "negative", sentimentScore: -0.4, urgency: "medium", confidence: 0.91, automationSafe: true, status: "resolved", createdAt: new Date(now - 5 * 86400000), updatedAt: new Date(now - 5 * 86400000 + 7 * 60000), resolvedAt: new Date(now - 5 * 86400000 + 7 * 60000), slaDueAt: new Date(now - 5 * 86400000 + 4 * 3600000) },
  { id: "cas_h3", caseNumber: "CSE-2024-0133", customerId: "cus_02", orderId: "ord_03", channel: "email", subject: "Lamp arrived broken", message: "The lamp came shattered. I want a refund.", intent: "damaged_item", sentiment: "frustrated", sentimentScore: -0.7, urgency: "high", confidence: 0.88, automationSafe: true, status: "resolved", createdAt: new Date(now - 7 * 86400000), updatedAt: new Date(now - 7 * 86400000 + 12 * 60000), resolvedAt: new Date(now - 7 * 86400000 + 12 * 60000), slaDueAt: new Date(now - 7 * 86400000 + 4 * 3600000) },
];

const auditEntries = [
  { id: "aud_01", caseId: "cas_h3", customerId: "cus_02", actorType: "system", action: "case.intake", category: "intake", detail: "Email received from Daniel Okafor — subject: 'Lamp arrived broken'", metadata: null, createdAt: new Date(now - 7 * 86400000) },
  { id: "aud_02", caseId: "cas_h3", customerId: "cus_02", actorType: "ai", action: "case.classify", category: "classification", detail: "Intent=damaged_item, Sentiment=frustrated (-0.7), Urgency=high, Confidence=0.88", metadata: JSON.stringify({ model: "gemini-classifier", latency_ms: 410 }), createdAt: new Date(now - 7 * 86400000 + 800) },
  { id: "aud_03", caseId: "cas_h3", customerId: "cus_02", actorType: "ai", action: "case.retrieve", category: "retrieval", detail: "Retrieved policy DAMAGE-FULL and order ord_03 record", metadata: null, createdAt: new Date(now - 7 * 86400000 + 1900) },
  { id: "aud_04", caseId: "cas_h3", customerId: "cus_02", actorType: "ai", action: "case.plan", category: "planning", detail: "Plan: full refund issued (auto-eligible under DAMAGE-FULL), retention email drafted", metadata: null, createdAt: new Date(now - 7 * 86400000 + 3100) },
  { id: "aud_05", caseId: "cas_h3", customerId: "cus_02", actorType: "ai", action: "workflow.execute", category: "action", detail: "Refund of $145.00 issued to original payment method", metadata: null, createdAt: new Date(now - 7 * 86400000 + 720000) },
  { id: "aud_06", caseId: "cas_h3", customerId: "cus_02", actorType: "system", action: "case.resolve", category: "state", detail: "Case marked resolved — customer response sent, refund posted", metadata: null, createdAt: new Date(now - 7 * 86400000 + 720000) },
];

// ── Demo users for NextAuth ───────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = "tentacle-demo-salt";
  return createHash("sha256").update(salt + password).digest("hex");
}

const users = [
  { id: "usr_01", email: "avery@marigold.co", name: "Avery Kim", passwordHash: hashPassword("demo1234"), role: "agent", avatarHue: 160 },
  { id: "usr_02", email: "bennett@marigold.co", name: "Bennett Cho", passwordHash: hashPassword("demo1234"), role: "manager", avatarHue: 24 },
  { id: "usr_03", email: "admin@marigold.co", name: "Admin User", passwordHash: hashPassword("admin1234"), role: "admin", avatarHue: 280 },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");

  // Clean slate
  await db.caseLearningEntry.deleteMany();
  await db.auditLog.deleteMany();
  await db.case.deleteMany();
  await db.order.deleteMany();
  await db.policy.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
  await db.metric.deleteMany();
  await db.appSetting.deleteMany();

  // Users
  console.log(`  → ${users.length} users`);
  for (const u of users) {
    await db.user.create({ data: u });
  }

  // Customers
  console.log(`  → ${customers.length} customers`);
  for (const c of customers) {
    await db.customer.create({ data: c });
  }

  // Orders
  console.log(`  → ${orders.length} orders`);
  for (const o of orders) {
    await db.order.create({ data: o });
  }

  // Policies
  console.log(`  → ${policies.length} policies`);
  for (const p of policies) {
    await db.policy.create({ data: p });
  }

  // Cases
  console.log(`  → ${cases.length} cases`);
  for (const c of cases) {
    await db.case.create({ data: c });
  }

  // Audit logs
  console.log(`  → ${auditEntries.length} audit entries`);
  for (const a of auditEntries) {
    await db.auditLog.create({ data: a });
  }

  // Metrics
  const metrics = [
    { key: "totalCases", value: 247 },
    { key: "autoResolved", value: 198 },
    { key: "escalated", value: 18 },
    { key: "open", value: 31 },
    { key: "avgResolutionMins", value: 4.2 },
    { key: "avgConfidence", value: 0.89 },
    { key: "automationRate", value: 0.802 },
    { key: "estimatedHoursSaved", value: 87.5 },
  ];
  console.log(`  → ${metrics.length} metrics`);
  for (const m of metrics) {
    await db.metric.create({ data: m });
  }

  // App settings (singleton)
  await db.appSetting.create({ data: { id: 1 } });
  console.log("  → app settings (default)");

  // Learning entries — organizational memory from past overrides
  const learningEntries = [
    {
      id: "learn_01",
      caseId: "cas_h2",
      customerId: "cus_05",
      overrideType: "rejected_action",
      originalDecision: JSON.stringify({ action: "refund", confidence: 0.78, automationSafe: true }),
      humanDecision: JSON.stringify({ action: "replacement", note: "Customer preferred replacement over refund" }),
      context: JSON.stringify({ intent: "wrong_product", sentiment: "negative", urgency: "medium", orderTotalCents: 10100, policyCodes: ["WRONG-PRODUCT"] }),
      feedbackNote: "The AI should check if the customer explicitly asks for a replacement before defaulting to refund.",
      createdBy: "usr_01",
      createdAt: new Date(now - 5 * 86400000 + 10 * 60000),
    },
    {
      id: "learn_02",
      caseId: "cas_h3",
      customerId: "cus_02",
      overrideType: "edited_draft",
      originalDecision: JSON.stringify({ action: "refund", confidence: 0.88, automationSafe: true }),
      humanDecision: JSON.stringify({ action: "refund", note: "Edited tone to be more empathetic" }),
      context: JSON.stringify({ intent: "damaged_item", sentiment: "frustrated", urgency: "high", orderTotalCents: 14500, policyCodes: ["DAMAGE-FULL"] }),
      feedbackNote: "The AI's draft was too transactional for a frustrated customer. Added empathy sentence.",
      createdBy: "usr_02",
      createdAt: new Date(now - 7 * 86400000 + 15 * 60000),
    },
    {
      id: "learn_03",
      caseId: "cas_h1",
      customerId: "cus_01",
      overrideType: "resolved_differently",
      originalDecision: JSON.stringify({ action: "send_response", confidence: 0.94, automationSafe: true }),
      humanDecision: JSON.stringify({ action: "send_response", note: "Resolved with FAQ link instead of full response" }),
      context: JSON.stringify({ intent: "return_eligibility", sentiment: "neutral", urgency: "low", orderTotalCents: 21900, policyCodes: ["RETURN-ELIG-90"] }),
      feedbackNote: "For simple policy questions, a shorter response with a link works better than a full explanation.",
      createdBy: "usr_01",
      createdAt: new Date(now - 3 * 86400000 + 8 * 60000),
    },
  ];
  console.log(`  → ${learningEntries.length} learning entries`);
  for (const e of learningEntries) {
    await db.caseLearningEntry.create({ data: e });
  }

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Demo login credentials:");
  console.log("  Agent:    avery@marigold.co / demo1234");
  console.log("  Manager:  bennett@marigold.co / demo1234");
  console.log("  Admin:    admin@marigold.co / admin1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
