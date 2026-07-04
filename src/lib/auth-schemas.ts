import { z } from "zod";

// Shared Zod schemas for the Daddy Zinger authentication flows.
// Kept framework-agnostic so both routes and future server functions can reuse them.

export const emailSchema = z.string().trim().email("Enter a valid email").max(255);

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Password is too long");

export const strongPasswordSchema = passwordSchema
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number");

export const nameSchema = z.string().trim().min(2, "Enter your name").max(80);

/**
 * Pakistan mobile-number schema. Accepts `03XXXXXXXXX` or `+92XXXXXXXXXX`,
 * normalises to E.164 (`+92XXXXXXXXXX`). Rejects all international numbers.
 */
export const pkPhoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-]/g, ""))
  .refine(
    (v) => /^(?:\+92\d{10}|0?3\d{9})$/.test(v),
    "Enter a valid Pakistani mobile number",
  )
  .transform((v) => {
    if (v.startsWith("+92")) return v;
    if (v.startsWith("03")) return "+92" + v.slice(1);
    if (v.startsWith("3")) return "+92" + v;
    return v;
  });

export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

export const birthdaySchema = z
  .string()
  .min(1, "Add your birthday")
  .refine((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 13 && age < 120;
  }, "You must be at least 13");

export const registerSchema = z.object({
  full_name: nameSchema,
  email: emailSchema,
  phone: pkPhoneSchema,
  password: strongPasswordSchema,
  confirm_password: z.string(),
  birthday: birthdaySchema,
  accept_terms: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms" }) }),
  marketing_opt_in: z.boolean().default(false),
}).refine((v) => v.password === v.confirm_password, {
  path: ["confirm_password"],
  message: "Passwords don't match",
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Password strength scorer used by the visual meter.
export function scorePassword(pw: string) {
  const checks = {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length; // 0..5
  return { checks, score };
}
