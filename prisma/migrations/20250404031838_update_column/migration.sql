/*
  Warnings:

  - You are about to drop the column `topicId` on the `TopicPosts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[topicName,postId]` on the table `TopicPosts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `topicName` to the `TopicPosts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TopicPosts" DROP CONSTRAINT "TopicPosts_topicId_fkey";

-- DropIndex
DROP INDEX "TopicPosts_topicId_postId_key";

-- AlterTable
ALTER TABLE "TopicPosts" DROP COLUMN "topicId",
ADD COLUMN     "topicName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TopicPosts_topicName_postId_key" ON "TopicPosts"("topicName", "postId");

-- AddForeignKey
ALTER TABLE "TopicPosts" ADD CONSTRAINT "TopicPosts_topicName_fkey" FOREIGN KEY ("topicName") REFERENCES "Topic"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
