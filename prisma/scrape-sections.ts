import { PrismaClient } from "@prisma/client";
import * as fs from 'fs';

const prisma = new PrismaClient();
const cacheDir = "./raw/sections/";

async function scrapeSections(termCode : string) {
    console.log("Collecting section data...");
    for (var i = 0; i <= 2; i++) {
        console.log("Downloading step " + i);
        var response = await fetch("https://my.ucdavis.edu/schedulebuilder/cf/search/search.cfc", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            "body": `method=search&termCode=${termCode}&filters=%7B%22searchTerm%22%3A%22${i}%22%2C%22addFilters%22%3A%22%22%7D&pidm=4413506`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });
        var text = await response.text();
        var path = cacheDir + termCode + "/" + i + ".json";
        console.log("Writing file to path: " + path);
        fs.writeFileSync(path, text);
    }
}

scrapeSections("202610")
    .then(() => {
        console.log("Successfully retrieved sections!");
    });