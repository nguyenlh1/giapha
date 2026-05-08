import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // 1. Create Admin User
    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.upsert({
        where: { email: "admin@giapha.vn" },
        update: {},
        create: {
            email: "admin@giapha.vn",
            name: "Admin User",
            password: hashedPassword,
            role: "ADMIN",
        },
    });

    // 2. Create Editor and Viewer for testing
    await prisma.user.upsert({
        where: { email: "editor@giapha.vn" },
        update: {},
        create: {
            email: "editor@giapha.vn",
            name: "Editor User",
            password: hashedPassword,
            role: "EDITOR",
        },
    });

    await prisma.user.upsert({
        where: { email: "viewer@giapha.vn" },
        update: {},
        create: {
            email: "viewer@giapha.vn",
            name: "Viewer User",
            password: hashedPassword,
            role: "VIEWER",
        },
    });

    // 3. Create Clan
    const nguyenClan = await prisma.clan.upsert({
        where: { id: "clan-nguyen" },
        update: {},
        create: {
            id: "clan-nguyen",
            name: "Dòng Họ Nguyễn",
            description: "Gia phả họ Nguyễn tại Hà Nội",
        },
    });

    // 4. Create Persons (Generations 1 to 4)
    console.log("Seeding persons...");

    const personsData = [
        // Gen 1
        { id: "p1", code: "NG-001", fullName: "Nguyễn Văn Trưởng", gender: "MALE", gen: 1, birthYear: 1930, deathYear: 2010 },
        { id: "p2", code: "TR-001", fullName: "Trần Thị Hạnh", gender: "FEMALE", gen: 1, birthYear: 1935, deathYear: 2015 },

        // Gen 2
        { id: "p3", code: "NG-002", fullName: "Nguyễn Văn Hai", gender: "MALE", gen: 2, birthYear: 1955 },
        { id: "p4", code: "NG-003", fullName: "Nguyễn Thị Ba", gender: "FEMALE", gen: 2, birthYear: 1958 },
        { id: "p5", code: "NG-004", fullName: "Nguyễn Văn Bốn", gender: "MALE", gen: 2, birthYear: 1962 },

        // Spouses for Gen 2
        { id: "p11", code: "LE-001", fullName: "Lê Thị Xuân", gender: "FEMALE", gen: 2, birthYear: 1958 }, // Wife of Hai
        { id: "p12", code: "PH-001", fullName: "Phạm Văn Tài", gender: "MALE", gen: 2, birthYear: 1955 },    // Husband of Ba
        { id: "p13", code: "HO-001", fullName: "Hồ Thị Oanh", gender: "FEMALE", gen: 2, birthYear: 1965 },  // Wife of Bốn

        // Gen 3
        { id: "p6", code: "NG-005", fullName: "Nguyễn Văn Năm", gender: "MALE", gen: 3, birthYear: 1980 },    // Son of Hai
        { id: "p7", code: "NG-006", fullName: "Nguyễn Thị Sáu", gender: "FEMALE", gen: 3, birthYear: 1983 }, // Daughter of Hai
        { id: "p8", code: "PH-002", fullName: "Phạm Thị Bảy", gender: "FEMALE", gen: 3, birthYear: 1985 },    // Daughter of Ba
        { id: "p9", code: "NG-007", fullName: "Nguyễn Văn Tám", gender: "MALE", gen: 3, birthYear: 1990 },    // Son of Bốn

        // Spouses for Gen 3
        { id: "p14", code: "VU-001", fullName: "Vũ Thị Chín", gender: "FEMALE", gen: 3, birthYear: 1982 }, // Wife of Năm

        // Gen 4
        { id: "p10", code: "NG-008", fullName: "Nguyễn Văn Mười", gender: "MALE", gen: 4, birthYear: 2010 }, // Son of Năm
    ] as const;

    for (const p of personsData) {
        await prisma.person.upsert({
            where: { id: p.id },
            update: {},
            create: {
                id: p.id,
                clanId: nguyenClan.id,
                code: p.code,
                fullName: p.fullName,
                gender: p.gender as "MALE" | "FEMALE",
                generation: p.gen,
                birthDate: p.birthYear ? new Date(`${p.birthYear}-01-01T00:00:00.000Z`) : null,
                deathDate: ("deathYear" in p) && p.deathYear ? new Date(`${p.deathYear}-01-01T00:00:00.000Z`) : null,
                bio: `Tiểu sử của ${p.fullName}`,
            },
        });
    }

    // 5. Create Relationships
    console.log("Seeding relationships...");

    const relationsData = [
        // Gen 1 Spouse
        { from: "p1", to: "p2", type: "SPOUSE" },

        // Gen 1 to Gen 2 (Children of Trưởng & Hạnh)
        { from: "p1", to: "p3", type: "PARENT_CHILD" },
        { from: "p2", to: "p3", type: "PARENT_CHILD" },
        { from: "p1", to: "p4", type: "PARENT_CHILD" },
        { from: "p2", to: "p4", type: "PARENT_CHILD" },
        { from: "p1", to: "p5", type: "PARENT_CHILD" },
        { from: "p2", to: "p5", type: "PARENT_CHILD" },

        // Gen 2 Spouses
        { from: "p3", to: "p11", type: "SPOUSE" }, // Hai & Xuân
        { from: "p12", to: "p4", type: "SPOUSE" }, // Tài & Ba
        { from: "p5", to: "p13", type: "SPOUSE" }, // Bốn & Oanh

        // Gen 2 to Gen 3
        // Children of Hai & Xuân
        { from: "p3", to: "p6", type: "PARENT_CHILD" },
        { from: "p11", to: "p6", type: "PARENT_CHILD" },
        { from: "p3", to: "p7", type: "PARENT_CHILD" },
        { from: "p11", to: "p7", type: "PARENT_CHILD" },

        // Children of Ba & Tài
        { from: "p4", to: "p8", type: "PARENT_CHILD" },
        { from: "p12", to: "p8", type: "PARENT_CHILD" },

        // Children of Bốn & Oanh
        { from: "p5", to: "p9", type: "PARENT_CHILD" },
        { from: "p13", to: "p9", type: "PARENT_CHILD" },

        // Gen 3 Spouses
        { from: "p6", to: "p14", type: "SPOUSE" }, // Năm & Chín

        // Gen 3 to Gen 4 (Children of Năm & Chín)
        { from: "p6", to: "p10", type: "PARENT_CHILD" },
        { from: "p14", to: "p10", type: "PARENT_CHILD" },
    ] as const;

    for (const r of relationsData) {
        const existing = await prisma.relationship.findFirst({
            where: {
                fromPersonId: r.from,
                toPersonId: r.to,
                type: r.type as "PARENT_CHILD" | "SPOUSE",
            },
        });

        if (!existing) {
            await prisma.relationship.create({
                data: {
                    fromPersonId: r.from,
                    toPersonId: r.to,
                    type: r.type as "PARENT_CHILD" | "SPOUSE",
                    relationSubType: "BIOLOGICAL",
                },
            });
        }
    }

    console.log("Seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
