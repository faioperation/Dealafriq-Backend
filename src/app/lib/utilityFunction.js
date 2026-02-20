export async function generateUniqueUsername(prisma, name) {
  // Basic sanitize
  let base = name.trim().toLowerCase().replace(/\s+/g, "");
  let username = base;
  let counter = 1;

  // Check uniqueness
  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existingUser) {
      // ✅ Unique found
      return username;
    }

    // Otherwise increment and try again
    username = `${base}${counter}`;
    counter++;
  }
}