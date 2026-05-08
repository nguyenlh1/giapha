import NextAuth from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string | null;
            role: Role;
        };
    }

    interface User {
        role: Role;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: Role;
        id: string;
    }
}
