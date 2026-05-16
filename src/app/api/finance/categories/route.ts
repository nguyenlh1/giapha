import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";
import { z } from "zod";

const categorySchema = z.object({
    clanId: z.string().min(1),
    name: z.string().min(1, "Name is required"),
    type: z.enum(["CONTRIBUTION", "EXPENSE"]),
});

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get("clanId");

    // Admin only or clan-specific validation
    if (!clanId || (user.clanId && user.clanId !== clanId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const categories = await prisma.financeCategory.findMany({
            where: { clanId },
            orderBy: [{ type: "asc" }, { name: "asc" }],
        });

        return NextResponse.json(categories);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user || user.role === "VIEWER") return unauthorized();

    try {
        const data = await request.json();
        const parsed = categorySchema.parse(data);

        // Verify write access to clan
        if (user.clanId && user.clanId !== parsed.clanId) {
            return NextResponse.json({ error: "Unauthorized to write to this clan" }, { status: 403 });
        }

        // Verify clan exists
        const clan = await prisma.clan.findUnique({ where: { id: parsed.clanId } });
        if (!clan) {
            return NextResponse.json({ error: "Clan not found" }, { status: 404 });
        }

        // Check duplicate
        const existing = await prisma.financeCategory.findFirst({
            where: { clanId: parsed.clanId, name: parsed.name, type: parsed.type }
        });
        if (existing) {
            return NextResponse.json({ error: "Category string already exists for this type" }, { status: 400 });
        }

        const category = await prisma.financeCategory.create({
            data: parsed,
        });

        return NextResponse.json(category);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 400 });
    }
}
