export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    amount: 149900,
    changes: 3,
    description: "Small updates for an existing website.",
  },
  growth: {
    id: "growth",
    name: "Growth",
    amount: 399900,
    changes: 8,
    description: "Regular content and layout improvements.",
  },
  scale: {
    id: "scale",
    name: "Scale",
    amount: 699900,
    changes: 15,
    description: "Frequent updates across your website.",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}