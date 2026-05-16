import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const clans = await prisma.clan.findMany({
        where: user.clanId ? { id: user.clanId } : undefined,
        include: {
            _count: { select: { persons: true } },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(clans);
}
