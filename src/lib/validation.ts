import { z } from "zod";

export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must contain at least 2 characters.")
    .max(120, "Full name cannot exceed 120 characters."),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(160, "Email cannot exceed 160 characters."),

  subject: z
    .string()
    .trim()
    .min(2, "Please select or enter a subject.")
    .max(100, "Subject cannot exceed 100 characters."),

  message: z
    .string()
    .trim()
    .min(10, "Please write a message with at least 10 characters.")
    .max(5000, "Message cannot exceed 5000 characters."),
});

export const quoteSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must contain at least 2 characters.")
    .max(80, "First name cannot exceed 80 characters."),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must contain at least 2 characters.")
    .max(80, "Last name cannot exceed 80 characters."),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(160, "Email cannot exceed 160 characters."),

  interest: z
    .string()
    .trim()
    .min(2, "Please select or enter your interest.")
    .max(80, "Interest cannot exceed 80 characters."),

  /*
   * Added for the service detail pages, which carry the selected
   * service into the enquiry. Both are optional so that quotes
   * submitted from the short form on /services — and every quote
   * already stored — remain valid against this schema.
   */
  budget: z
    .string()
    .trim()
    .max(80, "Budget cannot exceed 80 characters.")
    .optional(),

  requirements: z
    .string()
    .trim()
    .max(5000, "Project details cannot exceed 5000 characters.")
    .optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;