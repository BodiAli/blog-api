-- DropForeignKey
ALTER TABLE "LikePosts" DROP CONSTRAINT "LikePosts_postId_fkey";

-- AddForeignKey
ALTER TABLE "LikePosts" ADD CONSTRAINT "LikePosts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
