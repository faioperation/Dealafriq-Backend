-- CreateTable
CREATE TABLE "zoom_accounts" (
    "id" TEXT NOT NULL,
    "zoomUserId" TEXT NOT NULL,
    "zoomEmail" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "connectedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zoom_accounts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "zoom_accounts" ADD CONSTRAINT "zoom_accounts_connectedUserId_fkey" FOREIGN KEY ("connectedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
