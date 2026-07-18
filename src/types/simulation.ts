// Business impact simulation types

export interface BusinessImpactSimulation {
  action: string;
  actionLabel: string;
  refundCostCents: number;
  refundCostFormatted: string;
  customerLTV: number;
  customerLTVFormatted: string;
  retentionProbability: number;     // 0-1: estimated probability customer stays
  retentionProbabilityPct: string;
  retentionImpactCents: number;     // LTV × (1 - retentionProbability)
  retentionImpactFormatted: string;
  slaImpact: {
    meetsSLA: boolean;
    estimatedResolutionMins: number;
    slaDeadline: string;
    slaStatus: "on_track" | "at_risk" | "breached";
  };
  riskScore: number;                // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  netBusinessImpactCents: number;   // refundCost + retentionImpact - LTV_saved
  netBusinessImpactFormatted: string;
  recommendation: "approve" | "review" | "reject";
  recommendationReason: string;
  alternatives: Array<{
    action: string;
    actionLabel: string;
    refundCostCents: number;
    retentionProbability: number;
    riskScore: number;
    netBusinessImpactCents: number;
    recommendation: "approve" | "review" | "reject";
  }>;
}
