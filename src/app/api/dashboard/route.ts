import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const [totalMembers, totalClans, totalRelationships, maxGen] = await Promise.all([
        prisma.person.count({ where: { isDeleted: false } }),
        prisma.clan.count(),
        prisma.relationship.count(),
        prisma.person.aggregate({
            _max: { generation: true },
            where: { isDeleted: false },
        }),
    ]);

    const recentMembers = await prisma.person.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { clan: true },
    });

    return NextResponse.json({
        totalMembers,
        totalClans,
        totalRelationships,
        totalGenerations: maxGen._max.generation || 0,
        recentMembers,
    });
}
