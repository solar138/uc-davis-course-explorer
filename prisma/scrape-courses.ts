import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

const RAW_DATA_DIR = path.join(process.cwd(), 'raw_catalog_xml');

// A helper to sleep between requests so UC Davis doesn't block your IP
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadEntireCatalog() {
  // 1. Create the local directory if it doesn't exist
  await fs.mkdir(RAW_DATA_DIR, { recursive: true });
  console.log(`📁 Created storage directory at ${RAW_DATA_DIR}`);

  try {
    // 2. Fetch the Master A-Z Index to get all subject codes
    console.log("Fetching master subject list...");
    const indexUrl = 'https://catalog.ucdavis.edu/courses-subject-code/index.xml';
    const indexResponse = await axios.get(indexUrl);
    
    // Use a simple Regex to find all the subject codes (e.g., "MAT", "PHY", "AAS")
    // CourseLeaf usually formats links like: <a href="/courses-subject-code/mat/">
    const subjectMatches = [...indexResponse.data.matchAll(/\/courses-subject-code\/([a-z0-9]+)\//g)];
    
    // Deduplicate the codes using a Set
    const subjectCodes = Array.from(new Set(subjectMatches.map(m => m)));
    
    console.log(`🎯 Found ${subjectCodes.length} departments. Starting download...`);

    // 3. Loop through every code and download its XML file
    for (let i = 0; i < subjectCodes.length; i++) {
      const code = subjectCodes[i][1];
      const fileUrl = `https://catalog.ucdavis.edu/courses-subject-code/${code}/index.xml`;
      const filePath = path.join(RAW_DATA_DIR, `${code}.xml`);

      console.log(code);

      try {
        const response = await axios.get(fileUrl);
        
        // Save the raw XML string directly to your hard drive
        await fs.writeFile(filePath, response.data, 'utf-8');
        console.log(`[${i + 1}/${subjectCodes.length}] ✅ Saved ${code.toUpperCase()} to disk.`);
        
        // Wait 500ms before the next request to be polite to their servers
        await delay(500); 

      } catch (err) {
        console.error(`❌ Failed to download ${code.toUpperCase()}`);
      }
    }

    console.log("🎉 Catalog download complete!");

  } catch (error) {
    console.error("Failed to fetch the master index:", error);
  }
}

downloadEntireCatalog();