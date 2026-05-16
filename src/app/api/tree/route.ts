import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const requestedClanId = searchParams.get("clanId");
    const clanId = user.clanId || requestedClanId;

    if (!clanId) {
        return NextResponse.json({ error: "clanId is required" }, { status: 400 });
    }

    const persons = await prisma.person.findMany({
        where: { clanId, isDeleted: false },
        orderBy: [{ generation: "asc" }, { fullName: "asc" }],
    });

    const relationships = await prisma.relationship.findMany({
        where: {
            fromPerson: { clanId, isDeleted: false },
            toPerson: { clanId, isDeleted: false },
        },
    });

    // Build React Flow nodes
    const nodes = persons.map((p) => ({
        id: p.id,
        type: "personNode",
        data: {
            label: p.fullName,
            code: p.code,
            gender: p.gender,
            generation: p.generation,
            birthDate: p.birthDate,
            deathDate: p.deathDate,
            bio: p.bio,
        },
        position: { x: 0, y: 0 }, // Will be laid out by dagre
    }));

    // Deduplicate parent-child edges to prevent double drawing lines from both Husband and Wife
    const personMap = new Map(persons.map(p => [p.id, p]));
    const finalRelationships: typeof relationships = [];
    const childrenMap = new Map<string, typeof relationships>();

    relationships.forEach(r => {
        if (r.type === "SPOUSE") {
            finalRelationships.push(r);
        } else {
            if (!childrenMap.has(r.toPersonId)) childrenMap.set(r.toPersonId, []);
            childrenMap.get(r.toPersonId)!.push(r);
        }
    });

    for (const edges of Array.from(childrenMap.values())) {
        if (edges.length === 1) {
            finalRelationships.push(edges[0]);
        } else {
            edges.sort((a: any, b: any) => {
                const pA = personMap.get(a.fromPersonId);
                const pB = personMap.get(b.fromPersonId);
                if (pA?.gender === "MALE" && pB?.gender !== "MALE") return -1;
                if (pB?.gender === "MALE" && pA?.gender !== "MALE") return 1;
                return 0;
            });
            finalRelationships.push(edges[0]);
        }
    }

    // Build React Flow edges
    const edges = finalRelationships.map((r) => ({
        id: r.id,
        source: r.fromPersonId,
        target: r.toPersonId,
        type: "step",
        isSpouse: r.type === "SPOUSE",
        relationSubType: r.relationSubType,
        animated: r.type === "SPOUSE",
        style: {
            stroke: r.type === "SPOUSE" ? "#f59e0b" : "#3b82f6",
            strokeWidth: 3,
        },
    }));

    return NextResponse.json({ nodes, edges });
}
