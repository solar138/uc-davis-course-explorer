
export default function getTermName(termCode : string) {
    if (termCode.length != 6)
        return "Invalid Term Code";

    var year = termCode.slice(0, 4);
    var code = termCode.slice(4, 6);

    var name = termCodeToName[code];
    if (name == undefined)
        return "Unknown Term " + year;

    return `${name} ${year}`;
}

export const termCodeToName : Record<string, string> = {
    "01": "Winter Quarter",
    "02": "Spring Semester",
    "03": "Spring Quarter",
    "04": "???", // 04 doesn't seem to exist
    "05": "Summer Session 1",
    "06": "Summer Special Session",
    "07": "Summer Session 2",
    "08": "Summer Quarter",
    "09": "Fall Semester",
    "10": "Fall Quarter",
}

export const currentTerm = "202701";
export const availableTerms = [ "202610", "202701" ];
