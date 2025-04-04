/*
  Warnings:

  - You are about to drop the `_PostToTopic` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_PostToTopic" DROP CONSTRAINT "_PostToTopic_A_fkey";

-- DropForeignKey
ALTER TABLE "_PostToTopic" DROP CONSTRAINT "_PostToTopic_B_fkey";

-- DropTable
DROP TABLE "_PostToTopic";

-- CreateTable
CREATE TABLE "TopicPosts" (
    "id" SERIAL NOT NULL,
    "postId" TEXT NOT NULL,
    "topicId" INTEGER NOT NULL,

    CONSTRAINT "TopicPosts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TopicPosts" ADD CONSTRAINT "TopicPosts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPosts" ADD CONSTRAINT "TopicPosts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
