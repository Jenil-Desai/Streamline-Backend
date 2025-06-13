import { z } from 'zod';

export const onboardSchema = z.object({
  bio: z.string().min(1, 'Bio is required'),
  country: z.string().min(1, 'Country is required'),
});

export type OnboardSchema = z.infer<typeof onboardSchema>;
