-- DropForeignKey
ALTER TABLE "LikeComments" DROP CONSTRAINT "LikeComments_commentId_fkey";

-- AddForeignKey
ALTER TABLE "LikeComments" ADD CONSTRAINT "LikeComments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
