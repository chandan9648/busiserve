import { z } from "zod";

export const contactSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160),
  subject: z.string().min(2).max(100),
  message: z.string().min(10).max(5000),
});

export const quoteSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  email: z.string().email().max(160),
  interest: z.string().min(2).max(80),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
