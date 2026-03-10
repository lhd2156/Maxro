const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('maxro');
    const result = await db.collection('personal_records').deleteMany({ workoutId: { $exists: false } });
    console.log(`Deleted ${result.deletedCount} old orphaned PRs`);
    
    // Also log how many PRs have workoutIds but that workoutId doesn't exist in workouts
    const prsWithWorkoutId = await db.collection('personal_records').find({ workoutId: { $exists: true } }).toArray();
    let orphanedCount = 0;
    for (const pr of prsWithWorkoutId) {
      const workoutExists = await db.collection('workouts').findOne({ _id: pr.workoutId });
      if (!workoutExists) {
        await db.collection('personal_records').deleteOne({ _id: pr._id });
        orphanedCount++;
      }
    }
    console.log(`Deleted ${orphanedCount} PRs linked to non-existent workouts`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);