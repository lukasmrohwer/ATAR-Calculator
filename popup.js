//add buttons
let add = document.getElementById("add");
let calculate = document.getElementById("calculate");
let clear = document.getElementById("clear");
let m_add = document.getElementById("m_add")

//create list of subjects using session storage
var data = []
chrome.storage.session.get(["data"]).then((result) => {
    for (i in result.data)
        data.push(result.data[i])
    update(data)
});

//update screen
function update(data) {
    
    //clear subjects container
    const subjectscontainer = document.getElementById("subjectscontainer")
    subjectscontainer.innerHTML = ""
    
    //create division for each subject and show data
    for (let i = 0; i < data.length; i++) {
        //create divsion
        var subjectcontainer = document.createElement('div');
        subjectcontainer.style = "text-align:left"
        
        //subject name text
        subjectcontainer.innerText = data[i]["name"]

        //subject average text
        average = document.createElement('span')
        average.style = "float:right"
        average.innerText = data[i]["average"].toFixed(2)
        subjectcontainer.appendChild(average)

        //add to subjects container
        subjectscontainer.appendChild(subjectcontainer);
    }
}

//manual add button function
m_add.addEventListener("click", async () => {
    var subject_name = document.getElementById('name').value    
    var subject_average = document.getElementById('average').value
    var subject_bonus = 0
    
    //check if bonus applicable
    if (subject_name.includes("French") || subject_name.includes("Methods") || subject_name.includes("Specialist") || subject_name.includes("Second Language") || subject_name.includes("Indonesian")) {
        subject_bonus = 0.1
    }

    //validate subject name entry
    if (subject_name == "") {
        subject_name = "Unnamed Subject"
    }

    if (/^[0-9]+(\.)?[0-9]*$/.test(subject_average) == true) {
        subject_average = parseFloat(subject_average)
    } else {
        alert("Average entered is not a valid number.")
        return
    }
 


    //add data to storage
    subject = {
        name: subject_name,
        average: subject_average,
        bonus: subject_bonus
    }
    data.push(subject)

    update(data)
    
})

//add event listener for add button click
add.addEventListener("click", async () => {
    
    //select tab
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    //make sure on an assessment page and if not exit function
    if (tab.url.includes("sa.duncraigshs.wa.edu.au/#?page=/assessments") == false) {
        alert("This function only works when on a SEQTA assessments page.")
        return
    }


    //scrape from page and save subject data to list
    chrome.scripting.executeScript({
        args: [data],
        target: {tabId: tab.id},
        func: addSubject
    }, (result) => {
        data = result[0]["result"]
        chrome.storage.session.set({ data: data })
        update(data)
    });
})

//clear subjects button
clear.addEventListener("click", async () => {
    data = []
    chrome.storage.session.set({ data: data })
    update(data)
})


//calculate atar
calculate.addEventListener("click", async () => {
    //bonuses
    var bonus = 0
    for (i in data) {
        bonus = bonus + data[i]["average"]*data[i]["bonus"]
    }
    
    //gather averages into an array
    var arr = []
    for (i in data) {
        arr.push(data[i]["average"])
    }
    
    //create array of top 4 scores and sum them
    const sumkGreatest = (arr = [], num = 4) => {
        if(num > arr.length){
            return [];
        };
        const sorter = (a, b) => b - a;
        const descendingCopy = arr.slice().sort(sorter);
        return descendingCopy.splice(0, num).reduce((partialSum, a) => partialSum + a, 0);
    };
    sum = sumkGreatest(arr);

    //add sum and bonuses
    tea = sum + bonus
    tea = parseFloat(tea).toFixed(1)

    //convert tea to atar
    atar = conversion[String(tea)]

    //selects division to contain atar result
    resultscontainer = document.getElementById("result")

    //creates header element containing atar score
    var predicted_atar = document.getElementById("predictedatar")
    if (arr.length < 4) {
        predicted_atar.innerText = "Add at least 4 subjects."
    } else if (tea > 430) {
        predicted_atar.innerText = "TEA Score exceeds the maximum possible value."
    } else if (tea < 0) {
        predicted_atar.innerText = "TEA Score cannot be lower than zero."
    } else {
        predicted_atar.innerText = "Based on 2022 results, your predicted ATAR is " + atar
    }

})

function addSubject(data) {
    var mark_total = 0
    var weight_total = 0
    var subject_bonus = 0
    assessmentsheader = 0

    //get name of subject
    const subject_name = document.getElementById("title").textContent

    //check if bonus applicable
    if (subject_name.includes("French") || subject_name.includes("Methods") || subject_name.includes("Specialist") || subject_name.includes("Second Language") || subject_name.includes("Indonesian")) {
        subject_bonus = 0.1
    }

    //selects released assessments if possible
    var headers = document.getElementsByClassName("Collapsible__Collapsible___3O8P3  Collapsible__expanded___1wlf0");
    for (header of headers) {
        var headerlabel = header.getElementsByClassName("Label__innerText___1iir3")[0].innerHTML
        if (headerlabel == "Results and feedback released") {
            assessmentsheader = header
        } else {
            mark_total = 0
        }
    }
    
    //makes assessments an empty list if there are none
    try{
        assessments = assessmentsheader.getElementsByClassName("AssessmentItem__AssessmentItem___2EZ95 ");
    } catch {
        assessments = []
    }

    for (assessment of assessments){
        //grab assessment title
        const assessment_title = assessment.getElementsByClassName("AssessmentItem__title___2bELn")[0].textContent;
        
        //get the weight of the assessment from the title
        function getWeight(assessment_title) {
            try{
                const weight = assessment_title.match(/\d+(?:\.\d+)?%/g)[0].replace("%","");
                return parseFloat(weight)
            } catch {
                if (assessment_title == "Task 4 - Acids & Bases Test") {
                    const weight = 4.5
                    return weight
                } else {
                    const weight = 0
                    return weight
                }
            }
        }
        const weight = getWeight(assessment_title)
        console.log(weight)

        //get mark
        const mark = parseFloat(assessment.getElementsByClassName("Thermoscore__text___1NdvB ")[0].textContent.replace("%",""))

        //add to mark total
        var mark_total = mark_total + mark*weight

        //add to weight total
        var weight_total = weight_total + weight 
    }

    //calculate average
    var subject_average = mark_total/weight_total
    if (isNaN(subject_average)) {
        subject_average = 0
    }

    //add data to storage
    subject = {
        name: subject_name,
        average: subject_average,
        bonus: subject_bonus
    }
    data.push(subject)
    return data
}
