import * as fs from 'fs/promises';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RAW_DATA_DIR = path.join(process.cwd(), 'raw', 'catalog');

async function seedDatabase() {
  console.log('Starting catalog parsing... ');
  
  try {
    // 1. Get a list of all the XML files you downloaded
    const files = await fs.readdir(RAW_DATA_DIR);
    const xmlFiles = files.filter(f => f.endsWith('.xml'));
    
    // 2. Loop through every department file
    let totalCoursesAdded = await parseFiles(xmlFiles);

    console.log(`Added ${totalCoursesAdded} total courses`);

  } catch (error) {
    console.error('Fatal Error during parsing:', error);
  } finally {
    await prisma.$disconnect();
  }
}
async function parseFiles(xmlFiles: string[]) {
  let totalCoursesAdded = 0;
  for (const file of xmlFiles) {
    const filePath = path.join(RAW_DATA_DIR, file);
    const xmlData = await fs.readFile(filePath, 'utf-8');

    // 3. Extract the CDATA HTML block
    const cdataMatch = xmlData.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (!cdataMatch) continue; // Skip if empty or malformed

    const coursesToSave: any[] = [];
    const rawHtml = cdataMatch[1];
    parseCourses(rawHtml, coursesToSave);

    // 5. Save them to the database!
    // We use a `for...of` loop with an `upsert` so we don't duplicate courses if you run this twice.
    let deptCount = 0;
    for (const course of coursesToSave) {
      await prisma.course.upsert({
        where: { code: course.code }, // Assuming 'code' is @unique in your schema
        update: course,
        create: { ...course, prerequisiteRules: [] }
      });
      deptCount++;
    }

    totalCoursesAdded += deptCount;
    console.log(`✅ Processed ${file.replace('.xml', '').toUpperCase()}: ${deptCount} courses saved.`);
  }
  return totalCoursesAdded;
}

function parseCourses(rawHtml: string, coursesToSave: any[]) {
  const $ = cheerio.load(rawHtml);

  // 4. Parse every course in this department
  $('.courseblock').each((_, el) => {
    const hasNewVersion = $(el).text().includes('This version has ended');

    let slugCode, rawCode, title, units, description, rawPrereqs;
    const attributes: Record<string, string> = {};

    if (hasNewVersion) {
      // --- BRANCH A: EXTRACT THE UPDATED VERSION ---
      // Find the specific hidden list that contains the new Fall 2026 data
      const $updatedList = $(el).find('ul').filter((_, ul) => $(ul).text().includes('This course version is effective from'));

      // The title/code is inside an <h5> tag: "ABG 299 — Research (1-12 units)"
      const headerText = $updatedList.find('h5').text().trim();

      const headerMatch = headerText.match(/^(.*?)\s*—\s*(.*?)\s*\((.*?)\)/);
      if (headerMatch) {
        rawCode = headerMatch[1].trim().replaceAll(" ", " "); // "ABG 299"
        slugCode = rawCode.replace(/\s+/g, '').toUpperCase(); // "ABG299"
        title = headerMatch[2].trim(); // "Research"
        units = headerMatch[3].trim(); // "1-12"
      }

      // console.log(rawCode, slugCode, title, units);

      // The rest of the data is cleanly formatted in list items!
      $updatedList.find('li').each((_, li) => {
        const label = $(li).find('.label').text().replace(':', '').trim();
        const value = $(li).text().replace($(li).find('.label').text(), '').trim();

        if (label === 'Course Description') description = value;
        else if (label === 'Prerequisite(s)') rawPrereqs = value;
        else if (label) attributes[label] = value;
      });

    } else {
      // --- BRANCH B: NORMAL COURSE PARSING ---
      const $cleanBody = $(el).clone();
      // $cleanBody.find('[hidden="true"], .notinpdf').remove(); // Safe to remove here

      rawCode = $cleanBody.find('.detail-code').text().trim().replaceAll(" ", " ");
      slugCode = rawCode.replace(/\s+/g, '').toUpperCase();
      title = $cleanBody.find('.detail-title').text().replace('—', '').trim();
      units = $cleanBody.find('.detail-hours_html').text().replace(/[()]/g, '').replace('units', '').trim();
      description = $cleanBody.find('.courseblockextra').first().text().replace(/Course Description:\s*/, '').trim();
      rawPrereqs = $cleanBody.find('.detail-prerequisite').text().replace(/Prerequisite\(s\):\s*/, '').trim();

      $cleanBody.find('li').each((_, liEl) => {
        const label = $(liEl).find('.label').text().replace(':', '').trim();
        const value = $(liEl).text().replace($(liEl).find('.label').text(), '').trim();
        if (label && value) attributes[label] = value;
      });
    }

    // Skip ghost courses
    if (!slugCode) { return; }
    // console.log(attributes);

    coursesToSave.push({
      code: rawCode,
      slug: slugCode, // e.g., "MAT021A"
      name: title,
      units: units,
      schoolName: "ucdavis",
      description: description,
      rawPrerequisitesText: rawPrereqs,
      learningActivities: parseLearningActivities(attributes['Learning Activities']),
      generalEducation: parseGeneralEducation(attributes['General Education']),
      grading: attributes['Grade Mode'] || "N/A",
    });
  });
}

function parseGeneralEducation(geString?: string) {
  if (!geString) return null;

  // The final semantic object
  const result = {
    topicalBreadth: [] as string[],
    coreLiteracies: [] as string[]
  };

  // UC Davis Master GE Dictionary
  const topicalBreadthDict: Record<string, string> = {
    "Arts & Humanities": "AH", "Arts and Humanities": "AH", "(AH)": "AH",
    "Science & Engineering": "SE", "Science and Engineering": "SE", "(SE)": "SE",
    "Social Sciences": "SS", "(SS)": "SS"
  };

  const coreLiteraciesDict: Record<string, string> = {
    "American Cultures, Governance, and History": "ACGH", "American Cultures": "ACGH", "(ACGH)": "ACGH",
    "Domestic Diversity": "DD", "(DD)": "DD",
    "Oral Skills": "OL", "(OL)": "OL",
    "Quantitative Literacy": "QL", "(QL)": "QL",
    "Scientific Literacy": "SL", "(SL)": "SL",
    "Visual Literacy": "VL", "(VL)": "VL",
    "World Cultures": "WC", "(WC)": "WC",
    "Writing Experience": "WE", "(WE)": "WE"
  };

  const foundTopical = new Set<string>();
  const foundLiteracies = new Set<string>();

  for (const [keyword, code] of Object.entries(topicalBreadthDict)) {
    if (geString.toLowerCase().includes(keyword.toLowerCase())) {
      foundTopical.add(code);
    }
  }

  for (const [keyword, code] of Object.entries(coreLiteraciesDict)) {
    if (geString.toLowerCase().includes(keyword.toLowerCase())) {
      foundLiteracies.add(code);
    }
  }

  result.topicalBreadth = Array.from(foundTopical);
  result.coreLiteracies = Array.from(foundLiteracies);

  if (result.topicalBreadth.length === 0 && result.coreLiteracies.length === 0) {
    return null;
  }

  return result;
}
// Transforms: "Lecture 3 hour(s), Extensive Problem Solving."
// Into: [ { activity: "Lecture", hours: "3" }, { activity: "Extensive Problem Solving", hours: null } ]
function parseLearningActivities(laString?: string) {
  if (!laString) return null;

  return laString.split(',').map(item => {
    // Clean up trailing periods or spaces
    const cleanItem = item.trim().replace(/\.$/, '');
    
    // Group 1 (.*?): The activity name (e.g., "Lecture", "Discussion")
    // Group 2 (\d...): The number or range (e.g., "3", "1.5", "1-2")
    // The "\s*hour\(s\)" is left OUTSIDE the capture groups so it gets discarded
    const match = cleanItem.match(/^(.*?)\s+(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)\s*hour\(s\)/i);
    
    if (match) {
      return { activity: match[1].trim(), hours: match[2].trim() };
    }
    
    // Fallback for activities with no hours listed (e.g., "Extensive Problem Solving", "Variable")
    return { activity: cleanItem, hours: null };
  }).filter(la => la.activity !== "");
}

// parseFiles(["mat.xml"]);
seedDatabase();