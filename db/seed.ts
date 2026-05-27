import { eq } from 'drizzle-orm';
import { db } from './index';
import {
  accounts,
  programmes,
  projects,
  phases,
  stakeholders,
  snapshots,
  stakeholderPositions,
  permissions,
} from './schema';

async function main() {
  await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({ name: 'Acme Consulting', ownerUserId: 'seed_user_1' })
      .returning();

    const [programme] = await tx
      .insert(programmes)
      .values({ accountId: account.id, name: 'Digital Transformation' })
      .returning();

    // Create the project first with a null currentPhaseId...
    const [project] = await tx
      .insert(projects)
      .values({ programmeId: programme.id, name: 'Discovery Phase', currentPhaseId: null })
      .returning();

    // ...then the phase...
    const [phase] = await tx
      .insert(phases)
      .values({ projectId: project.id, name: 'Discovery', orderIndex: 0 })
      .returning();

    // ...then point the project at the phase (avoids the chicken-and-egg).
    await tx.update(projects).set({ currentPhaseId: phase.id }).where(eq(projects.id, project.id));

    const insertedStakeholders = await tx
      .insert(stakeholders)
      .values([
        { accountId: account.id, name: 'Priya Shah', role: 'Head of Finance' },
        { accountId: account.id, name: 'Marcus Lee', role: 'CTO' },
        { accountId: account.id, name: 'Aoife Byrne', role: 'Marketing Lead' },
      ])
      .returning();

    const stakeholderByName = (name: string) => {
      const match = insertedStakeholders.find((s) => s.name === name);
      if (!match) throw new Error(`Seed error: stakeholder "${name}" not found`);
      return match;
    };

    const [snapshot] = await tx
      .insert(snapshots)
      .values({
        projectId: project.id,
        phaseId: phase.id,
        label: 'Initial map',
        capturedByUserId: 'seed_user_1',
      })
      .returning();

    await tx.insert(stakeholderPositions).values([
      {
        // High power, moderate interest — classic "keep satisfied".
        stakeholderId: stakeholderByName('Priya Shah').id,
        projectId: project.id,
        snapshotId: snapshot.id,
        power: 8,
        interest: 6,
        relationship: 3,
        targetPower: 8,
        targetInterest: 8,
        targetRelationship: 4,
      },
      {
        // High power, high interest — "manage closely".
        stakeholderId: stakeholderByName('Marcus Lee').id,
        projectId: project.id,
        snapshotId: snapshot.id,
        power: 9,
        interest: 8,
        relationship: 4,
        targetPower: 9,
        targetInterest: 9,
        targetRelationship: 5,
      },
      {
        // Moderate power, high interest — "keep informed". Targets left partly
        // null to exercise the nullable target columns.
        stakeholderId: stakeholderByName('Aoife Byrne').id,
        projectId: project.id,
        snapshotId: snapshot.id,
        power: 5,
        interest: 7,
        relationship: 3,
        targetRelationship: 4,
      },
    ]);

    await tx.insert(permissions).values({
      userId: 'seed_user_1',
      scopeType: 'account',
      scopeId: account.id,
      role: 'director',
    });

    console.log(`Seeded account ${account.id} (project ${project.id}, snapshot ${snapshot.id})`);
  });

  console.log('Seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
