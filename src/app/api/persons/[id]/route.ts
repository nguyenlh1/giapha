import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite } from "@/lib/rbac";
import { personUpdateSchema } from "@/lib/validations";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const person = await prisma.person.findUnique({
        where: { id: params.id },
        include: {
            clan: true,
            relationsFrom: {
                include: { toPerson: true },
            },
            relationsTo: {
                include: { fromPerson: true },
            },
            lifeEvents: true,
        },
    });

    if (!person) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json(person);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    const body = await request.json();
    const parsed = personUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: any = { ...data };
    if (data.birthDate) updateData.birthDate = new Date(data.birthDate);
    if (data.deathDate) updateData.deathDate = new Date(data.deathDate);

    const person = await prisma.person.update({
        where: { id: params.id },
        data: updateData,
    });

    return NextResponse.json(person);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    await prisma.person.update({
        where: { id: params.id },
        data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
}
