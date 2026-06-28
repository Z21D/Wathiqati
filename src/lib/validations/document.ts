import { z } from "zod";

export const documentSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  employeeName: z.string().optional(),
  documentType: z.string().min(1, "Document name is required"),
  referenceId: z.string().min(1, "Document number is required"),
  description: z.string().optional(),
  expiresAt: z.string().min(1, "Expiry date is required"),
});

export type DocumentInput = z.infer<typeof documentSchema>;

export const excelRowSchema = z.object({
  companyName: z.string().min(1),
  employeeName: z.string().nullable().optional(),
  documentType: z.string().min(1),
  referenceId: z.string().min(1),
  expiresAt: z.coerce.date(),
});

export type ExcelRowInput = z.infer<typeof excelRowSchema>;
