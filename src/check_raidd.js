import prisma from "./app/prisma/client.js";

async function main() {
    const raiddId = "2388f87d-c74c-446b-82ad-83002f99b72d";
    console.log("Fetching RAIDD:", raiddId);

    const raidd = await prisma.raidd.findUnique({
        where: { id: raiddId },
        include: {
            risks: true,
            assumptions: true,
            issues: true,
            decisions: true,
            dependencies: true
        }
    });

    if (!raidd) {
        console.log("RAIDD record not found!");
        return;
    }

    console.log("RAIDD Record Details:");
    console.log(JSON.stringify(raidd, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
