import { z } from 'zod';

export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  bio: z.string().min(1, "Bio cannot be empty").max(500, "Bio cannot exceed 500 characters"),
  country: z.string().min(2, "Country is required").max(3, "Country cannot exceed 3 characters"),
});

export type ProfileSchema = z.infer<typeof profileSchema>;
