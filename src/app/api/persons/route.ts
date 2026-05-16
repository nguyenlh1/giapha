import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite, hasClanAccess } from "@/lib/rbac";
import { personCreateSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get("clanId");
    const search = searchParams.get("search") || "";
    const generation = searchParams.get("generation");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (user.clanId) {
        where.clanId = user.clanId; // Strictly enforce
    } else if (clanId) {
        where.clanId = clanId;
    }

    if (search) {
        where.OR = [
            { fullName: { contains: search } },
            { code: { contains: search } },
        ];
    }
    if (generation) where.generation = parseInt(generation);

    const [persons, total] = await Promise.all([
        prisma.person.findMany({
            where,
            include: { clan: true },
            skip,
            take: limit,
            orderBy: [{ generation: "asc" }, { fullName: "asc" }],
        }),
        prisma.person.count({ where }),
    ]);

    return NextResponse.json({ persons, total, page, limit });
}

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user || user.role === "VIEWER") return forbidden();

    const body = await request.json();
    const parsed = personCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    if (!hasClanAccess(user, data.clanId)) return forbidden();

    const person = await prisma.person.create({
        data: {
            clanId: data.clanId,
            code: data.code,
            fullName: data.fullName,
            gender: data.gender,
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
            deathDate: data.deathDate ? new Date(data.deathDate) : null,
            generation: data.generation,
            bio: data.bio,
            avatarUrl: data.avatarUrl,
        },
    });

    return NextResponse.json(person, { status: 201 });
}
