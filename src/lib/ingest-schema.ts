import { z } from 'zod';

export const modelItemSchema = z.object({
  provider: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
  }),
  slug: z.string().min(1),
  name: z.string().min(1),
  contextWindow: z.number().int().positive(),
  inputPricePerM: z.union([z.number(), z.string()]),
  outputPricePerM: z.union([z.number(), z.string()]),
  modalityTags: z.array(z.string()).optional(),
  availability: z.string().optional(),
});

export const ingestPayloadSchema = z.object({
  source: z.string().min(1).optional().default('api'),
  models: z.array(modelItemSchema),
});
