export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    amount: 2900,
    changes: 3,
    description: "Small updates for an existing website.",
  },
  growth: {
    id: "growth",
    name: "Growth",
    amount: 5900,
    changes: 8,
    description: "Regular content and layout improvements.",
  },
  scale: {
    id: "scale",
    name: "Scale",
    amount: 9900,
    changes: 15,
    description: "Frequent updates across your website.",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}