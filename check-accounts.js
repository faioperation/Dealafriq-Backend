import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkAccount() {
    const email = "the-user-email-if-known@example.com"; // I'll try to find any google accounts first
    const accounts = await prisma.emailAccount.findMany({
        where: { provider: 'google' },
        select: {
            userId: true,
            email: true,
            isConnected: true,
            expiryDate: true
        }
    });

    console.log("Found Google Accounts:", JSON.stringify(accounts, null, 2));
    await prisma.$disconnect();
}

checkAccount();
