import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';

// Read firebase-applet-config.json
const configPath = './firebase-applet-config.json';
const configStr = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configStr);

const app = initializeApp(config);
const db = getFirestore(app);

async function fixIssues() {
  const issuesCol = collection(db, 'issues');
  const snapshot = await getDocs(issuesCol);
  
  let count = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    if (data.citizenName && data.citizenName.toLowerCase().includes('sowmya')) {
      await updateDoc(doc(db, 'issues', document.id), {
        community: 'Gachibowli',
        district: 'Hyderabad',
        state: 'Telangana',
        locationName: 'Gachibowli, Hyderabad, Telangana'
      });
      console.log(`Updated issue ${document.id} for citizen ${data.citizenName}`);
      count++;
    }
  }
  console.log(`Fixed ${count} issues.`);
}

fixIssues().catch(console.error);
