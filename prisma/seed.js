const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.docAccess.deleteMany({});
  await prisma.doc.deleteMany({});
  await prisma.user.deleteMany({});

  // Create 10 users
  const users = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        name: `User ${i}`,
      },
    });
    users.push(user);
    console.log(`✅ Created user: ${user.name} (${user.email})`);
  }

  // Create 3 documents with 3 different owners
  const docs = [];
  const docTitles = ['Project Proposal', 'Meeting Notes', 'Research Paper'];
  const docContents = [
    'This is the project proposal document with initial ideas and planning.',
    'Meeting notes from the team sync - covering action items and decisions.',
    'Research paper on collaborative editing systems and operational transformation.',
  ];

  for (let i = 0; i < 3; i++) {
    const doc = await prisma.doc.create({
      data: {
        title: docTitles[i],
        content: docContents[i],
        version: 0,
      },
    });
    docs.push(doc);
    console.log(`📄 Created document: ${doc.title}`);

    // Assign owner (users 0, 1, 2 as owners for docs 0, 1, 2)
    await prisma.docAccess.create({
      data: {
        userId: users[i].id,
        docId: doc.id,
        role: 'OWNER',
      },
    });
    console.log(`   👑 ${users[i].name} is OWNER`);
  }

  // Randomly assign remaining users to documents with EDITOR or VIEWER roles
  const roles = ['EDITOR', 'VIEWER'];
  
  for (let userIndex = 3; userIndex < 10; userIndex++) {
    // Randomly pick 1-3 documents for each user
    const numDocs = Math.floor(Math.random() * 3) + 1;
    const shuffledDocs = [...docs].sort(() => Math.random() - 0.5);
    
    for (let docCount = 0; docCount < numDocs; docCount++) {
      const doc = shuffledDocs[docCount];
      const randomRole = roles[Math.floor(Math.random() * roles.length)];
      
      // Check if user already has access to this doc
      const existing = await prisma.docAccess.findUnique({
        where: {
          docId_userId: {
            docId: doc.id,
            userId: users[userIndex].id,
          },
        },
      });

      if (!existing) {
        await prisma.docAccess.create({
          data: {
            userId: users[userIndex].id,
            docId: doc.id,
            role: randomRole,
          },
        });
        console.log(`   📝 ${users[userIndex].name} is ${randomRole} on "${doc.title}"`);
      }
    }
  }

  console.log('\n✨ Seed completed successfully!');
  console.log('\n📊 Summary:');
  
  const userCount = await prisma.user.count();
  const docCount = await prisma.doc.count();
  const accessCount = await prisma.docAccess.count();
  
  console.log(`   Users: ${userCount}`);
  console.log(`   Documents: ${docCount}`);
  console.log(`   Access records: ${accessCount}`);

  // Display document access summary
  console.log('\n📋 Document Access Summary:');
  for (const doc of docs) {
    const accesses = await prisma.docAccess.findMany({
      where: { docId: doc.id },
      include: { user: true },
      orderBy: { role: 'asc' },
    });
    
    console.log(`\n   "${doc.title}":`);
    accesses.forEach(access => {
      console.log(`      - ${access.user.name}: ${access.role}`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
