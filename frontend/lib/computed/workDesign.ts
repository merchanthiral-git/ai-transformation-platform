export function scoreTaskAiImpact(task: { type?: string; logic?: string; interaction?: string }): number {
  // 0-100 score based on task characteristics
  // Deterministic + Independent + Repetitive = highest score
  let score = 50;
  if (task.logic === "Deterministic") score += 20;
  else if (task.logic === "Probabilistic") score += 10;
  if (task.interaction === "Independent") score += 15;
  else if (task.interaction === "Interactive") score += 5;
  if (task.type === "Repetitive") score += 15;
  return Math.min(score, 100);
}

export function computeRoleROI(params: {
  tasks: any[];
  dispositions: any[];
  headcount: number;
  loadedCost: number;
  aiToolCost: number;
}): { annualSavings: number; toolCost: number; changeCost: number; netROI: number; paybackMonths: number } {
  // Stub implementation
  const hoursSaved = params.tasks.reduce((s: number, t: any) => s + (Number(t["Time Saved %"] || 0) * 0.4), 0);
  const annualSavings = hoursSaved * params.headcount * params.loadedCost / 2080;
  const toolCost = params.aiToolCost * params.headcount;
  const changeCost = params.headcount * 500;
  const netROI = annualSavings - toolCost - changeCost;
  const paybackMonths = netROI > 0 ? Math.ceil((toolCost + changeCost) / (annualSavings / 12)) : 0;
  return { annualSavings, toolCost, changeCost, netROI, paybackMonths };
}

export function computeCapacityWaterfall(params: {
  tasks: any[];
  weeklyHours: number;
}): { current: number; freed: number; reinvested: number; eliminated: number; future: number } {
  const current = params.weeklyHours;
  const freed = params.tasks.reduce((s: number, t: any) => {
    const curr = Number(t["Current Time Spent %"] || 0);
    const newPct = Number(t["New Time %"] || curr);
    return s + Math.max(curr - newPct, 0);
  }, 0) * params.weeklyHours / 100;
  const reinvested = freed * 0.6;
  const eliminated = freed * 0.4;
  const future = current - eliminated;
  return { current, freed, reinvested, eliminated, future };
}
