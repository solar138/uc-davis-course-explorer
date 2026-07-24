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

function parsePage(page: string, file: string, url?:string) {
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

function parseRequirements(html: string) {
    const $ = cheerio.load(html);
    const requirements: any[] = [];
    let currentCategory: any = null;
    let currentSubcategory: any = null;

    // Track if we are currently building an "OR" array block
    let isOrBlock = false;

    $('table.sc_courselist tbody tr').each((_, row) => {
        const $row = $(row);
        const text = $row.text().trim();
        const commentText = $row.find('.courselistcomment').text().trim() || text;

        // 1. Match Main Categories
        if ($row.hasClass('areaheader')) {
            currentCategory = { category: commentText, subcategories: [] };
            requirements.push(currentCategory);
            currentSubcategory = null;
            return;
        }

        // 2. Match Subcategories
        if ($row.hasClass('areasubheader')) {
            currentSubcategory = { header: commentText, courses: [] };
            if (currentCategory) currentCategory.subcategories.push(currentSubcategory);
            return;
        }

        // 3. Handle the "OR" logic
        if (text === 'OR' || commentText.includes('OR') || commentText.includes('Choose at least one')) {
            isOrBlock = true;
            return;
        }

        // 4. Extract standard courses
        const courseSlug = $row.find('.codecol').text()
            .replace(/\s+/g, '')
            .replace(/^or/i, '');

        // IF WE FOUND A SPECIFIC COURSE:
        if (courseSlug) {
            if (!currentCategory) {
                currentCategory = { category: "Program Requirements", subcategories: [] };
                requirements.push(currentCategory);
            }
            if (!currentSubcategory) {
                currentSubcategory = { header: "Core Requirements", courses: [] };
                currentCategory.subcategories.push(currentSubcategory);
            }

            if (isOrBlock) {
                const lastCourse = currentSubcategory.courses.pop();
                if (lastCourse !== undefined) {
                    Array.isArray(lastCourse)
                        ? currentSubcategory.courses.push([...lastCourse, courseSlug])
                        : currentSubcategory.courses.push([lastCourse, courseSlug]);
                } else {
                    currentSubcategory.courses.push(courseSlug);
                }
                isOrBlock = false;
            } else {
                currentSubcategory.courses.push(courseSlug);
            }
        }
        // FIX 4: THE "TEXT BLOCK" FALLBACK
        // If there is no specific course code, but there is a descriptive comment
        else if (commentText && !commentText.includes('Total Units')) {

            // Still need our implicit category fallbacks!
            if (!currentCategory) {
                currentCategory = { category: "Program Requirements", subcategories: [] };
                requirements.push(currentCategory);
            }
            if (!currentSubcategory) {
                currentSubcategory = { header: "Core Requirements", courses: [] };
                currentCategory.subcategories.push(currentSubcategory);
            }

            // Prefix it with "NOTE: " so your frontend knows it's an instruction, not a database slug
            currentSubcategory.courses.push(`NOTE: ${commentText}`);
        }
    });
    return requirements;
}

async function pushToDb(requirements: any, code: string, name: string, description = "", url="",school = "ucdavis") {
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