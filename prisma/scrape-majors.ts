import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as he from 'he';
import importedAliases from './major-aliases.json';
import importedShortNames from './major-shortnames.json';

// can scrape from courseleaf index.xml documents.
const prisma = new PrismaClient();

async function downloadIndex(url = "https://catalog.ucdavis.edu/departments-programs-degrees/index.xml") {

    var page;
    try {
        page = fs.readFileSync("./raw/majors.html");
        // console.log("Found cached index file locally.");
    } catch {
        console.log("Cached file not found, fetching from url.");
        const response = await fetch(url);

        const xml = await response.text();
        const $ = cheerio.load(xml, { xml: true });

        page = $("programsanddegreestext").html();
        if (page == null) {
            console.log("programsanddegreestext not found in index.");
            return;
        }

        console.log("Writing to cached file.");
        fs.writeFileSync("./raw/majors.html", page);
    }

    const $page = cheerio.load(page);
    const urls = []

    for (const link of $page("a")) {
        const href = link.attribs.href;
        if (href != undefined && href.startsWith("/departments-programs-degrees/")) {
            urls.push("https://" + (url.startsWith("http") ? url.split("/")[2] : url.split("/")[0]) + href + "index.xml")
        }
    }

    const cacheDir = "./raw/degrees/";
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
    }

    for (const url of urls) {
        const parts = url.split("/");
        const file = parts[parts.length - 2];
        try {
            var page;
            try {
                page = fs.readFileSync(cacheDir + file + ".xml");
                // console.log("Found cached file locally for " + file);
            } catch {
                console.log(file + " not found locally.");
                const response = await fetch(url);
                console.log(url + " found.")
                page = await response.text();
                fs.writeFileSync(cacheDir + file + ".xml", page);
            }
            parsePage(page as string, file, url);
        } catch {
            console.log(url + " not found.")
        }
    }
}

function parsePage(page: string, file: string, url?: string) {
    const $page = cheerio.load(page, { xml: true });
    const requirements = $page("requirementstext");
    const information = $page("informationtext");
    const title = $page("title").html();

    if (title == "") {
        console.log("title not found in " + file);
        return;
    }

    if (requirements.text() == "") {
        console.log("requirementstext not found in " + file);
    }
    const parsed = parseRequirements(requirements.text() ?? "");
    // const description = parseDescription(information.text() ?? "");
    pushToDb(parsed, file, title ?? "", cheerio.load($page("quickviewtext").text()).text() ?? "", url?.replace("/index.xml", ""));
}

function parseDescription(html: string) {
    const $ = cheerio.load(html);
    const programHeader = $('h3:contains("Undergraduate Program")');

    var description = "";

    if (programHeader.length > 0) {
        // look at sibling paragraphs
        programHeader.nextAll('p').each((i, el) => {
            const text = $(el).text().trim();

            // skip navigation/short intros
            if (text.length < 30) {
                return true;
            }

            // skip admin junk
            if (text.includes('ABET') || text.includes('accredited') || text.includes('administers')) {
                return true;
            }

            description = text;
            return false;
        });
    } else {
        console.log("no program header found");
    }
    return description;
}

const wordToNumber: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
};

function parseRequirementNumber(val: string): number {
  const lowerVal = val.toLowerCase();
  return wordToNumber[lowerVal] !== undefined ? wordToNumber[lowerVal] : parseInt(lowerVal, 10);
}

function parseRequirements(html: string) {
    if (!html) return [];

    const $ = cheerio.load(html);
    const requirements: any[] = [];

    let currentCategory: any = null;
    let currentSubcategory: any = null;
    let isOrBlock = false;
    let activeChoiceGroup: any = null;

    $('table.sc_courselist').each((_, table) => {
        const $table = $(table);

        // 1. Table Boundaries: Force close any active choice groups from the previous table
        if (activeChoiceGroup && currentSubcategory) {
            if (activeChoiceGroup.options.length === 0) {
                currentSubcategory.courses.pop();
                currentSubcategory.courses.push(`NOTE: ${activeChoiceGroup.instruction}`);
            }
        }
        activeChoiceGroup = null;
        isOrBlock = false;

        // 2. THE FIX: Look at the DOM element immediately preceding the table!
        const precedingText = $table.prev('h2, h3, h4').text().trim();
        const lowerPreceding = precedingText.toLowerCase();

        // skip not required courses
        if (lowerPreceding.includes("recommended")) {
            return;
        }

        // If the header above the table indicates a track or emphasis, create a new Subcategory!
        if (lowerPreceding.includes('track') ||
            lowerPreceding.includes('emphasis') ||
            lowerPreceding.includes('concentration')) {

            currentSubcategory = { header: precedingText, courses: [] };

            if (!currentCategory) {
                currentCategory = { category: "Program Requirements", subcategories: [] };
                requirements.push(currentCategory);
            }
            currentCategory.subcategories.push(currentSubcategory);
        }

        console.log("table found", precedingText);

        // 3. Loop through the rows of THIS specific table
        $table.find('tbody tr').each((_, row) => {
            const $row = $(row);
            const text = $row.text().replace(/\u00a0/g, ' ').trim();
            const commentText = $row.find('.courselistcomment').text().replace(/\u00a0/g, ' ').trim() || text;
            const hasCode = $row.find('.codecol').length > 0;

            if (text.includes('Total Units') || commentText.includes('Total Units')) return;

            // A. Match Main Categories
            if ($row.hasClass('areaheader')) {
                if (activeChoiceGroup && activeChoiceGroup.options.length === 0 && currentSubcategory) {
                    currentSubcategory.courses.pop();
                    currentSubcategory.courses.push(`NOTE: ${activeChoiceGroup.instruction}`);
                }
                currentCategory = { category: commentText, subcategories: [] };
                requirements.push(currentCategory);
                currentSubcategory = null;
                activeChoiceGroup = null;
                return;
            }

            // B. Match Subcategories
            if ($row.hasClass('areasubheader')) {
                if (activeChoiceGroup && activeChoiceGroup.options.length === 0 && currentSubcategory) {
                    currentSubcategory.courses.pop();
                    if (!activeChoiceGroup.instruction.includes("total"))
                        currentSubcategory.courses.push(`NOTE: ${activeChoiceGroup.instruction}`);
                }
                const cleanHeader = commentText
                    .replace(/^NOTE:\s*/i, '') // Removes "NOTE: " prefix
                    .replace(/[,:-]?\s*(choose|select)\s+.*$/i, '') // Strips ", choose one series..." or " - Select two"
                    .replace(/\s*\([^)]*(quarter|spring|winter|fall|summer|only)[^)]*\)/gi, '') // Strips scheduling like "(Fall only)"
                    .replace(/:\s*$/, '') // Removes any leftover trailing colons
                    .trim();

                currentSubcategory = { header: cleanHeader, courses: [] };

                const $hoursCol = $row.find('.hourscol');
                if ($hoursCol.length > 0 && $hoursCol[0].children.length > 0) {
                    if (currentSubcategory && !currentSubcategory.units) {
                        const data = ($hoursCol[0].children[0] as any).data.split("-");
                        currentSubcategory.units = data.length > 1 ? data.map((x: string) => +x) : +data[0];
                    }
                }

                if (currentCategory) {
                    currentCategory.subcategories.push(currentSubcategory);
                } else {
                    currentCategory = { category: "Program Requirements", subcategories: [currentSubcategory] };
                    requirements.push(currentCategory);
                }
                activeChoiceGroup = null;
                return;
            }

            // 4. "Choose X" Instructions -> Opens a new Choice Object
            const lowerComment = commentText.toLowerCase();

            if (!hasCode && (lowerComment.includes('choose') || lowerComment.includes('select'))) {
                if (!currentCategory) {
                    currentCategory = { category: "Program Requirements", subcategories: [] };
                    requirements.push(currentCategory);
                }
                if (!currentSubcategory) {
                    currentSubcategory = { header: "Core Requirements", courses: [] };
                    currentCategory.subcategories.push(currentSubcategory);
                }

                // Automatically close previous empty groups
                if (activeChoiceGroup && activeChoiceGroup.options.length === 0) {
                    currentSubcategory.courses.pop();
                    currentSubcategory.courses.push(`NOTE: ${activeChoiceGroup.instruction}`);
                }

                // Build a regex that looks for digits OR our spelled-out words
                const numberWords = Object.keys(wordToNumber).join('|');
                const unitRegex = new RegExp(`(\\d+|${numberWords})\\s+unit`, 'i');
                const courseRegex = new RegExp(`(\\d+|${numberWords})\\s+course`, 'i');

                const unitMatch = lowerComment.match(unitRegex);
                const courseMatch = lowerComment.match(courseRegex);

                activeChoiceGroup = {
                    type: "choice",
                    instruction: commentText,
                    units_required: unitMatch ? parseRequirementNumber(unitMatch[1]) : null,
                    courses_required: courseMatch ? parseRequirementNumber(courseMatch[1]) : null,
                    options: []
                };

                currentSubcategory.courses.push(activeChoiceGroup);
                return;
            }
            // 5. Old explicit "OR" text rows (Keep this just in case)
            if (text === 'OR' || commentText === 'OR') {
                if (!activeChoiceGroup) isOrBlock = true;
                return;
            }

            // 6. Course Codes
            const $codeCol = $row.find('.codecol');
            if ($codeCol.length > 0) {
                const codeText = $codeCol.text().replace(/\s+/g, '');

                // THE FIX: Check for the CourseLeaf 'orclass' or the inline "or" prefix
                const isOrCourse = $row.hasClass('orclass') || codeText.toLowerCase().startsWith('or');

                // Now it's safe to strip the "or" prefix to get the clean slug
                const rawSlug = codeText.replace(/^or/i, '');

                if (rawSlug && !rawSlug.includes("DISCONTINUED")) {
                    if (!currentCategory) {
                        currentCategory = { category: "Program Requirements", subcategories: [] };
                        requirements.push(currentCategory);
                    }
                    if (!currentSubcategory) {
                        currentSubcategory = { header: "Core Requirements", courses: [] };
                        currentCategory.subcategories.push(currentSubcategory);
                    }

                    // Convert sequences like "BIS002A&BIS002B" to structured AND objects
                    let parsedCourse: any = rawSlug;
                    if (rawSlug.includes('&')) {
                        parsedCourse = { type: "and", courses: rawSlug.split('&') };
                    }

                    if (activeChoiceGroup) {
                        activeChoiceGroup.options.push(parsedCourse);
                    }
                    else if (isOrCourse || isOrBlock) {
                        // If it's an alternate course, group it with the previous course!
                        const lastCourse = currentSubcategory.courses.pop();
                        if (lastCourse !== undefined) {
                            Array.isArray(lastCourse)
                                ? currentSubcategory.courses.push([...lastCourse, parsedCourse])
                                : currentSubcategory.courses.push([lastCourse, parsedCourse]);
                        } else {
                            currentSubcategory.courses.push(parsedCourse);
                        }
                        isOrBlock = false;
                    }
                    else {
                        currentSubcategory.courses.push(parsedCourse);
                    }
                    return;
                }
            }
            // F. Extract Text Blocks
            else if (commentText) {
                if (!currentCategory) {
                    currentCategory = { category: "Program Requirements", subcategories: [] };
                    requirements.push(currentCategory);
                }
                if (!currentSubcategory) {
                    currentSubcategory = { header: "Core Requirements", courses: [] };
                    currentCategory.subcategories.push(currentSubcategory);
                }

                if (activeChoiceGroup) {
                    activeChoiceGroup.options.push(`NOTE: ${commentText}`);
                } else {
                    currentSubcategory.courses.push(`NOTE: ${commentText}`);
                }
            }
        }); // End of Row Loop
    }); // End of Table Loop

    return requirements;
}

async function pushToDb(requirements: any, code: string, name: string, description = "", url = "", school = "ucdavis") {
    name = he.decode(name);
    var type = "unknown";
    const nameLower = name.toLowerCase();
    if (nameLower.includes("minor")) {
        type = "minor";
    } else if (nameLower.includes("doctor of")) {
        type = "phd";
    } else if (nameLower.includes("bachelor of science")) {
        type = "bachelor-sci";
    } else if (nameLower.includes("bachelor of arts")) {
        type = "bachelor-art";
    } else if (nameLower.includes("bachelor of education")) {
        type = "bachelor-edu";
    } else if (nameLower.includes("bachelor of business")) {
        type = "bachelor-bus";
    } else if (nameLower.includes("bachelor of law")) {
        type = "bachelor-law";
    } else if (nameLower.includes("bachelor of medicine")) {
        type = "bachelor-med";
    } else if (nameLower.includes("bachelor of pharmacy")) {
        type = "bachelor-pharm";
    } else if (nameLower.includes("bachelor of engineering")) {
        type = "bachelor-eng";
    } else if (nameLower.includes("bachelor of ")) {
        type = "bachelor-other";
    } else if (nameLower.includes("master of science")) {
        type = "master-sci";
    } else if (nameLower.includes("master of arts")) {
        type = "master-art";
    } else if (nameLower.includes("master of education")) {
        type = "master-edu";
    } else if (nameLower.includes("master of engineering")) {
        type = "master-eng";
    } else if (nameLower.includes("master of business administration")) {
        type = "master-ba";
    } else if (nameLower.includes("master of ")) {
        type = "master-other";
    } else if (nameLower.includes("designated emphasis")) {
        type = "designated-emphasis";
    }

    const aliases = [] as string[];

    const majorAliases = importedAliases as Record<string, string[]>;
    outerLoop:
    for (const alias in majorAliases) {
        const parts = alias.split(" ");
        for (const part of parts) {
            if (!nameLower.includes(part.toLowerCase())) {
                continue outerLoop;
            }
        }
        console.log(`Adding alias ${majorAliases[alias].join()} to degree program ${name}`);
        aliases.push(...majorAliases[alias]);
    }
    var shortName = "";

    const shortNames = importedShortNames as Record<string, string>;
    outerLoop:
    for (const name in shortNames) {
        const parts = name.split(" ");
        for (const part of parts) {
            if (!nameLower.includes(part.toLowerCase())) {
                continue outerLoop;
            }
        }
        console.log(`Adding shortname ${shortNames[name]} to degree program ${name}`);
        shortName = shortNames[name];
        break;
    }

    if (shortName == "") {
        shortName = name.split(", ").slice(0, -1).join(", ");
    }

    await prisma.degree.upsert({
        where: {
            school_code: {
                school,
                code
            }
        },
        update: {
            requirements,
            name,
            school,
            type,
            aliases,
            shortName,
            description,
            url
        },
        create: {
            code,
            requirements,
            name,
            school,
            type,
            aliases,
            shortName,
            description,
            url
        }
    });
}

function main() {
    if (process.argv.length == 3) {
        const file = process.argv[2];
        if (!fs.existsSync(file)) {
            console.log(`${file} not found.`);
            return;
        }
        const parts = file.split(/\\|\//);
        const fileName = parts[parts.length - 1].split(".")[0];
        const requirements = fs.readFileSync(file).toString();
        console.log(fileName, file);
        parsePage(requirements, fileName);
    } else if (process.argv.length > 3) {
        console.log("Too many arguments.");
    } else {
        downloadIndex();
    }
}

main();