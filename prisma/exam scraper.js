// goto the catalog and run in your browser
exams = []
previous = null;
for (const exam of $$("tr")) {
    if (exam.className =="sctablehead") continue;
    const elements = exam.querySelectorAll("td");
    if (elements.length != 4) continue;
    
    const name = Array.from(elements[0].childNodes).filter(x => x.nodeName != "SUP").map(text => text.textContent).join("").replaceAll(/\(.+\)/g, "").trim();
    const units = +elements[1].innerText;

    const courses = Array.from(elements[2].querySelectorAll("a")).map(e => e.innerText.replace(/\s/g, ""));
    const duplicateCredit = elements[3].innerText == "Yes";

    if (name.includes("With score")) {
        const scores = name.match(/\d/g);
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        
        previous.minScore = min;
        previous.maxScore = max;
        previous.units = units;
        previous.duplicateCredit = duplicateCredit;
        previous.courses = courses;
        exams.push(previous);
        previous = { name: previous.name, units, courses, duplicateCredit };
    } else {
        previous = { name, units, courses, duplicateCredit };
        if (units != "")
            exams.push(previous);
    }
}

// filtering stuff for AP exams
const filteredExams = exams.flatMap(exam => {
    if (exam.name.includes(" or ")) {
        const subject = exam.name.split("–");
        const names = subject[1].split(" or ");      
        const newExams = names.map(n => ({ ...exam, name: subject[0] + " " + n }));
        return newExams;
    }
    return [exam];
});
console.log(filteredExams);