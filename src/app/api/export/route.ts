import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite } from "@/lib/rbac";

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    const clans = await prisma.clan.findMany({
        where: user.clanId ? { id: user.clanId } : undefined,
        include: { persons: { include: { lifeEvents: true } } },
    });
    const relationships = await prisma.relationship.findMany();

    const exportData = {
        exportedAt: new Date().toISOString(),
        clans: clans.map((clan) => ({
            id: clan.id,
            name: clan.name,
            description: clan.description,
            persons: clan.persons.map((p) => ({
                id: p.id,
                code: p.code,
                fullName: p.fullName,
                gender: p.gender,
                birthDate: p.birthDate,
                deathDate: p.deathDate,
                generation: p.generation,
                bio: p.bio,
                avatarUrl: p.avatarUrl,
                lifeEvents: p.lifeEvents,
            })),
        })),
        relationships: relationships.map((r) => ({
            fromPersonId: r.fromPersonId,
            toPersonId: r.toPersonId,
            type: r.type,
            relationSubType: r.relationSubType,
            startDate: r.startDate,
            endDate: r.endDate,
        })),
    };

    return NextResponse.json(exportData);
}
