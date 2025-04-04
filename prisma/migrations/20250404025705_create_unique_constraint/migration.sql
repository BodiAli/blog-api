/*
  Warnings:

  - A unique constraint covering the columns `[topicId,postId]` on the table `TopicPosts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TopicPosts_topicId_postId_key" ON "TopicPosts"("topicId", "postId");
