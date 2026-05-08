import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export type SessionUser = {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "EDITOR" | "VIEWER";
};

export async function getSessionUser(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user as SessionUser;
}

export function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function canWrite(role: string): boolean {
    return role === "ADMIN" || role === "EDITOR";
}

export function isAdmin(role: string): boolean {
    return role === "ADMIN";
}

export async function requireAdmin(): Promise<SessionUser | null> {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") return null;
    return user;
}
