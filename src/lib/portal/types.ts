import type { PlanId } from "./plans";

export type Profile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
};

export type Subscription = {
  id: string;
  uid: string;
  planId: PlanId;
  planName: string;
  amount: number;
  allowance: number;
  used: number;
  startsAt: number;
  expiresAt: number;
  paymentId: string;
  orderId: string;
  createdAt: number;

  /**
   * When an administrator last changed `used`, or null if never.
   *
   * The customer's dashboard shows this so that a change to their
   * remaining allowance is dated rather than appearing from nowhere.
   * The administrator's own uid is deliberately not part of this
   * type: it is stored on the document, but it is not the
   * customer's business who inside Busiserve recorded the change.
   */
  usageUpdatedAt: number | null;
};

export type MeResponse = {
  profile: Profile;
  role: "admin" | "user";
  emailVerified: boolean;
  subscriptions: Subscription[];
  serverNow: number;
};

export type AdminUser = Profile & {
  active: Subscription | null;
};

export type AdminResponse = {
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  totalRevenue: number;

  planCounts: number[];

  monthlyRevenue: {
    label: string;
    amount: number;
  }[];

  users: AdminUser[];

  page: number;
  totalPages: number;
  serverNow: number;
};

export function subscriptionStatus(
  subscription: Subscription,
  now: number,
): "Scheduled" | "Expired" | "Active" {
  if (now < subscription.startsAt) {
    return "Scheduled";
  }

  if (now >= subscription.expiresAt) {
    return "Expired";
  }

  return "Active";
}