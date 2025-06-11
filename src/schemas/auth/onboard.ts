import { z } from 'zod';

export const onboardSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  bio: z.string().min(1, 'Bio is required'),
  country: z.string().min(1, 'Country is required'),
});

export type OnboardSchema = z.infer<typeof onboardSchema>;
