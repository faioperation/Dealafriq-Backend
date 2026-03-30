import bcrypt from "bcrypt";
import prisma from "../prisma/client.js";
import { Role } from "../utils/role.js";
import { envVars } from "../config/env.js";

export const seedUsers = async () => {
    try {
        console.log("------------------seed-----------------------");
        console.log("Checking database seeds...");
        
        const passwordHash = await bcrypt.hash("123456", Number(envVars.BCRYPT_SALT_ROUND || 10));

        const usersToSeed = [
            {
                email: "admin@test.com",
                firstName: "System",
                lastName: "Admin",
                role: Role.ADMIN,
                isVerified: true,
                passwordHash,
            },
            {
                email: "project@test.com",
                firstName: "Project",
                lastName: "Manager",
                role: Role.PROJECT_MANAGER,
                isVerified: true,
                passwordHash,
            }
        ];

        for (const userData of usersToSeed) {
            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existingUser) {
                console.log(`Seed value already exist for: ${userData.email}`);
            } else {
                await prisma.user.create({
                    data: userData
                });
                console.log(`Seeded new user: ${userData.email} with role ${userData.role}`);
            }
        }
        console.log("--------------------seed end---------------------");
    } catch (error) {
        console.error("Error during database seeding:", error);
        console.log("-----------------------------------------");
    }
};
