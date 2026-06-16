/**
 * Clean demo data from the database.
 *
 * Removes all reflections whose title starts with "[DEMO] ",
 * along with their associated comments and likes (cascade).
 *
 * Run:  node prisma/clean-demo.js
 * Or:   npm run db:clean-demo
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO_PREFIX = '[DEMO] ';

async function cleanDemo() {
  console.log('🧹  Cleaning demo data...');

  // Find all demo reflections
  const demoReflections = await prisma.reflection.findMany({
    where: { title: { startsWith: DEMO_PREFIX } },
    select: { id: true, title: true },
  });

  if (demoReflections.length === 0) {
    console.log('ℹ️  No demo data found. Nothing to clean.');
    return;
  }

  const ids = demoReflections.map((r) => r.id);

  // Delete likes for demo reflections
  const deletedLikes = await prisma.like.deleteMany({
    where: { reflectionId: { in: ids } },
  });
  console.log(`   🗑️  Deleted ${deletedLikes.count} likes`);

  // Delete comments for demo reflections
  const deletedComments = await prisma.comment.deleteMany({
    where: { reflectionId: { in: ids } },
  });
  console.log(`   🗑️  Deleted ${deletedComments.count} comments`);

  // Delete demo reflections
  const deletedReflections = await prisma.reflection.deleteMany({
    where: { id: { in: ids } },
  });
  console.log(`   🗑️  Deleted ${deletedReflections.count} reflections`);

  console.log('✅  Demo data cleaned successfully.');
}

cleanDemo()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
