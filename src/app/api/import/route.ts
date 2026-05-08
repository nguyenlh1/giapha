import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite } from "@/lib/rbac";

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    try {
        const data = await request.json();

        await prisma.$transaction(async (tx) => {
            // Import clans
            if (data.clans && Array.isArray(data.clans)) {
                for (const clan of data.clans) {
                    await tx.clan.upsert({
                        where: { id: clan.id },
                        update: { name: clan.name, description: clan.description },
                        create: {
                            id: clan.id,
                            name: clan.name,
                            description: clan.description,
                        },
                    });

                    // Import persons within clan
                    if (clan.persons && Array.isArray(clan.persons)) {
                        for (const person of clan.persons) {
                            await tx.person.upsert({
                                where: { id: person.id },
                                update: {
                                    code: person.code,
                                    fullName: person.fullName,
                                    gender: person.gender,
                                    birthDate: person.birthDate ? new Date(person.birthDate) : null,
                                    deathDate: person.deathDate ? new Date(person.deathDate) : null,
                                    generation: person.generation || 1,
                                    bio: person.bio,
                                    avatarUrl: person.avatarUrl,
                                },
                                create: {
                                    id: person.id,
                                    clanId: clan.id,
                                    code: person.code,
                                    fullName: person.fullName,
                                    gender: person.gender || "MALE",
                                    birthDate: person.birthDate ? new Date(person.birthDate) : null,
                                    deathDate: person.deathDate ? new Date(person.deathDate) : null,
                                    generation: person.generation || 1,
                                    bio: person.bio,
                                    avatarUrl: person.avatarUrl,
                                },
                            });

                            // Import life events
                            if (person.lifeEvents && Array.isArray(person.lifeEvents)) {
                                for (const event of person.lifeEvents) {
                                    await tx.lifeEvent.upsert({
                                        where: { id: event.id },
                                        update: {
                                            type: event.type,
                                            date: event.date ? new Date(event.date) : null,
                                            place: event.place,
                                            note: event.note,
                                        },
                                        create: {
                                            id: event.id,
                                            personId: person.id,
                                            type: event.type,
                                            date: event.date ? new Date(event.date) : null,
                                            place: event.place,
                                            note: event.note,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // Import relationships
            if (data.relationships && Array.isArray(data.relationships)) {
                for (const rel of data.relationships) {
                    const existing = await tx.relationship.findFirst({
                        where: {
                            fromPersonId: rel.fromPersonId,
                            toPersonId: rel.toPersonId,
                            type: rel.type,
                        },
                    });

                    if (!existing) {
                        await tx.relationship.create({
                            data: {
                                fromPersonId: rel.fromPersonId,
                                toPersonId: rel.toPersonId,
                                type: rel.type,
                                relationSubType: rel.relationSubType || "BIOLOGICAL",
                                startDate: rel.startDate ? new Date(rel.startDate) : null,
                                endDate: rel.endDate ? new Date(rel.endDate) : null,
                            },
                        });
                    }
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json(
            { error: "Import failed: " + error.message },
            { status: 500 }
        );
    }
}
