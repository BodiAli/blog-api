-- CreateTable
CREATE TABLE "LikePosts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "LikePosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikeComments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "LikeComments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LikePosts_userId_postId_key" ON "LikePosts"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "LikeComments_userId_commentId_key" ON "LikeComments"("userId", "commentId");

-- AddForeignKey
ALTER TABLE "LikePosts" ADD CONSTRAINT "LikePosts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikePosts" ADD CONSTRAINT "LikePosts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeComments" ADD CONSTRAINT "LikeComments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeComments" ADD CONSTRAINT "LikeComments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
