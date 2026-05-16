import { z } from "zod";

export const personCreateSchema = z.object({
    clanId: z.string().min(1, "Clan is required"),
    code: z.string().min(1, "Code is required").max(50),
    fullName: z.string().min(1, "Full name is required").max(200),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    birthDate: z.string().optional().nullable(),
    deathDate: z.string().optional().nullable(),
    generation: z.number().int().min(1).default(1),
    bio: z.string().optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
});

export const personUpdateSchema = personCreateSchema.partial();

export const relationshipCreateSchema = z.object({
    fromPersonId: z.string().min(1),
    toPersonId: z.string().min(1),
    type: z.enum(["PARENT_CHILD", "SPOUSE"]),
    relationSubType: z.enum(["BIOLOGICAL", "ADOPTIVE", "GUARDIAN", "STEP"]).default("BIOLOGICAL"),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const importSchema = z.object({
    clans: z.array(z.any()).optional(),
    persons: z.array(z.any()).optional(),
    relationships: z.array(z.any()).optional(),
    lifeEvents: z.array(z.any()).optional(),
});

export const userCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
    clanId: z.string().optional().nullable(),
});
