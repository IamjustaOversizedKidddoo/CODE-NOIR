import prisma from '../src/lib/db';

async function main() {
  console.log('Cleaning up old test project records from database...');
  const deletedProjects = await prisma.project.deleteMany({});
  console.log(`Deleted ${deletedProjects.count} project records.`);
  await prisma.$executeRawUnsafe('VACUUM;');
  console.log('Database vacuum completed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
