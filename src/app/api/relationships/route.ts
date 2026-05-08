import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite } from "@/lib/rbac";
import { relationshipCreateSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId");

    if (!personId) {
        return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const relationships = await prisma.relationship.findMany({
        where: {
            OR: [{ fromPersonId: personId }, { toPersonId: personId }],
        },
        include: {
            fromPerson: true,
            toPerson: true,
        },
    });

    return NextResponse.json(relationships);
}

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    const body = await request.json();
    const parsed = relationshipCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const relationship = await prisma.relationship.create({
        data: {
            fromPersonId: data.fromPersonId,
            toPersonId: data.toPersonId,
            type: data.type,
            relationSubType: data.relationSubType,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
        },
    });

    return NextResponse.json(relationship, { status: 201 });
}
