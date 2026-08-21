/* =========================================================
   ACTIONFORGE FRONTEND
   ========================================================= */

let currentPlan = null;


/* =========================================================
   ELEMENTS
   ========================================================= */

const goalInput =
    document.getElementById("goalInput");

const problemInput =
    document.getElementById("problemInput");

const generateBtn =
    document.getElementById("generateBtn");

const replanBtn =
    document.getElementById("replanBtn");

const newPlanBtn =
    document.getElementById("newPlanBtn");

const loading =
    document.getElementById("loading");

const hero =
    document.getElementById("hero");

const planSection =
    document.getElementById("planSection");

const errorBox =
    document.getElementById("error");

const errorMessage =
    document.getElementById("errorMessage");

const charCount =
    document.getElementById("charCount");

const pdfBtn =
    document.getElementById("pdfBtn");


/* =========================================================
   HELPERS
   ========================================================= */

function showLoading(show) {

    loading.classList.toggle(
        "hidden",
        !show
    );

}


function showError(message) {

    errorMessage.textContent =
        message;

    errorBox.classList.remove(
        "hidden"
    );

}


function clearError() {

    errorBox.classList.add(
        "hidden"
    );

}


function setButtonLoading(
    button,
    isLoading
) {

    if (!button) {
        return;
    }


    if (isLoading) {

        button.disabled = true;

        button.dataset.originalText =
            button.innerHTML;

        button.innerHTML =
            "Thinking...";

    } else {

        button.disabled = false;

        if (button.dataset.originalText) {

            button.innerHTML =
                button.dataset.originalText;

            delete button.dataset.originalText;

        }

    }

}


/* =========================================================
   SAFE RESPONSE PARSER
   ========================================================= */

async function parseApiResponse(response) {

    const responseText =
        await response.text();


    /*
     * Always log unexpected responses.
     * This is especially useful with Netlify functions.
     */

    if (
        !responseText ||
        !responseText.trim()
    ) {

        throw new Error(
            `Server returned an empty response (${response.status}).`
        );

    }


    let data;


    try {

        data =
            JSON.parse(responseText);

    }
    catch (error) {

        console.error(
            "========== NON-JSON SERVER RESPONSE =========="
        );

        console.error(
            "HTTP STATUS:",
            response.status
        );

        console.error(
            "CONTENT TYPE:",
            response.headers.get("content-type")
        );

        console.error(
            "RAW RESPONSE:",
            responseText
        );

        console.error(
            "==============================================="
        );


        /*
         * HTML usually means:
         *
         * - function URL is wrong
         * - Netlify function was not deployed
         * - Netlify returned a 404/500 page
         * - routing/configuration problem
         */

        if (
            responseText
                .trim()
                .toLowerCase()
                .startsWith("<!doctype") ||
            responseText
                .trim()
                .toLowerCase()
                .startsWith("<html")
        ) {

            throw new Error(
                `Netlify returned an HTML page instead of JSON (${response.status}). Check that the Netlify function is deployed.`
            );

        }


        throw new Error(
            `Server returned invalid JSON (${response.status}).`
        );

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            `Server error (${response.status}).`
        );

    }


    return data;

}


/* =========================================================
   CHARACTER COUNT
   ========================================================= */

if (goalInput) {

    goalInput.addEventListener(
        "input",
        () => {

            charCount.textContent =
                `${goalInput.value.length} / 5000`;

        }
    );

}


/* =========================================================
   EXAMPLE GOALS
   ========================================================= */

document
    .querySelectorAll(".example")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                goalInput.value =
                    button.dataset.goal;

                charCount.textContent =
                    `${goalInput.value.length} / 5000`;

                goalInput.focus();

            }
        );

    });


/* =========================================================
   RENDER PLAN
   ========================================================= */

function renderPlan(plan) {

    currentPlan =
        plan;


    document.getElementById(
        "goalTitle"
    ).textContent =
        plan.goal ||
        "Your goal";


    document.getElementById(
        "summary"
    ).textContent =
        plan.summary ||
        "";


    document.getElementById(
        "priority"
    ).textContent =
        (
            plan.priority ||
            "medium"
        ).toUpperCase();


    document.getElementById(
        "deadline"
    ).textContent =
        plan.deadline ||
        "Not specified";


    const tasks =
        Array.isArray(plan.tasks)
            ? plan.tasks
            : [];


    document.getElementById(
        "taskCount"
    ).textContent =
        tasks.length;


    const criticalPath =
        Array.isArray(
            plan.critical_path
        )
            ? plan.critical_path
            : [];


    document.getElementById(
        "criticalCount"
    ).textContent =
        criticalPath.length;


    document.getElementById(
        "insight"
    ).textContent =
        plan.insight ||
        "Focus on the highest-impact action first.";


    const tasksContainer =
        document.getElementById(
            "tasks"
        );


    tasksContainer.innerHTML =
        "";


    tasks.forEach(
        (task, index) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "task";


            const number =
                document.createElement(
                    "div"
                );

            number.className =
                "task-number";

            number.textContent =
                index + 1;


            const content =
                document.createElement(
                    "div"
                );

            content.className =
                "task-content";


            const title =
                document.createElement(
                    "h4"
                );

            title.textContent =
                task.title ||
                "Untitled task";


            const description =
                document.createElement(
                    "p"
                );

            description.textContent =
                task.description ||
                "";


            const meta =
                document.createElement(
                    "div"
                );

            meta.className =
                "task-meta";


            const priority =
                document.createElement(
                    "span"
                );

            priority.textContent =
                task.priority ||
                "medium";


            const time =
                document.createElement(
                    "span"
                );

            time.textContent =
                `${task.estimated_minutes || 0} min`;


            meta.appendChild(
                priority
            );

            meta.appendChild(
                time
            );


            content.appendChild(
                title
            );

            content.appendChild(
                description
            );

            content.appendChild(
                meta
            );


            card.appendChild(
                number
            );

            card.appendChild(
                content
            );


            tasksContainer.appendChild(
                card
            );

        }
    );


    planSection.classList.remove(
        "hidden"
    );


    document.getElementById(
        "changesSection"
    ).classList.add(
        "hidden"
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================================
   GENERATE PLAN
   ========================================================= */

generateBtn.addEventListener(
    "click",
    async () => {

        clearError();


        const goal =
            goalInput.value.trim();


        if (!goal) {

            showError(
                "Tell ActionForge what you want to accomplish."
            );

            goalInput.focus();

            return;

        }


        setButtonLoading(
            generateBtn,
            true
        );


        hero.classList.add(
            "hidden"
        );


        planSection.classList.add(
            "hidden"
        );


        showLoading(
            true
        );


        try {

            const response =
                await fetch(
                    "/.netlify/functions/plan",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                goal
                            })

                    }
                );


            const data =
                await parseApiResponse(
                    response
                );


            /*
             * The function should return the plan
             * directly.
             */

            renderPlan(
                data
            );


        }
        catch (error) {

            console.error(
                "GENERATE PLAN ERROR:",
                error
            );


            hero.classList.remove(
                "hidden"
            );


            showError(
                error.message ||
                "Unable to generate plan."
            );

        }
        finally {

            showLoading(
                false
            );


            setButtonLoading(
                generateBtn,
                false
            );

        }

    }
);


/* =========================================================
   REPLAN
   ========================================================= */

replanBtn.addEventListener(
    "click",
    async () => {

        clearError();


        if (!currentPlan) {

            showError(
                "Create a plan first."
            );

            return;

        }


        const problem =
            problemInput.value.trim();


        if (!problem) {

            showError(
                "Tell ActionForge what changed."
            );

            problemInput.focus();

            return;

        }


        setButtonLoading(
            replanBtn,
            true
        );


        showLoading(
            true
        );


        try {

            const response =
                await fetch(
                    "/.netlify/functions/replan",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                plan:
                                    currentPlan,

                                problem

                            })

                    }
                );


            const data =
                await parseApiResponse(
                    response
                );


            if (!data.updated_plan) {

                throw new Error(
                    "AI returned a response without an updated plan."
                );

            }


            renderPlan(
                data.updated_plan
            );


            renderChanges(
                data.changes
            );


            problemInput.value =
                "";


        }
        catch (error) {

            console.error(
                "REPLAN ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to replan."
            );

        }
        finally {

            showLoading(
                false
            );


            setButtonLoading(
                replanBtn,
                false
            );

        }

    }
);


/* =========================================================
   RENDER CHANGES
   ========================================================= */

function renderChanges(
    changes
) {

    const section =
        document.getElementById(
            "changesSection"
        );


    const container =
        document.getElementById(
            "changes"
        );


    container.innerHTML =
        "";


    if (
        !Array.isArray(changes) ||
        changes.length === 0
    ) {

        section.classList.add(
            "hidden"
        );

        return;

    }


    changes.forEach(
        change => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "change";


            item.textContent =
                change;


            container.appendChild(
                item
            );

        }
    );


    section.classList.remove(
        "hidden"
    );

}


/* =========================================================
   PDF EXPORT
   ========================================================= */

async function downloadPlanPDF() {

    if (!currentPlan) {

        showError(
            "Create a plan before downloading the PDF."
        );

        return;

    }


    /*
     * jsPDF is loaded from the CDN in index.html.
     */

    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        showError(
            "PDF generator is not available. Please refresh the page and try again."
        );

        return;

    }


    try {

        pdfBtn.classList.add(
            "loading"
        );

        pdfBtn.disabled =
            true;


        pdfBtn.dataset.originalText =
            pdfBtn.innerHTML;

        pdfBtn.innerHTML =
            "Preparing PDF...";


        const {
            jsPDF
        } =
            window.jspdf;


        const doc =
            new jsPDF({

                orientation:
                    "portrait",

                unit:
                    "mm",

                format:
                    "a4"

            });


        const margin =
            18;

        const pageWidth =
            doc.internal.pageSize.getWidth();

        const pageHeight =
            doc.internal.pageSize.getHeight();

        const contentWidth =
            pageWidth -
            margin * 2;

        let y =
            22;


        /*
         * Helper for page breaks.
         */

        function checkPageBreak(
            requiredHeight = 10
        ) {

            if (
                y + requiredHeight >
                pageHeight - 18
            ) {

                doc.addPage();

                y = 22;

            }

        }


        /*
         * TITLE
         */

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            24
        );

        doc.text(
            "ActionForge",
            margin,
            y
        );


        y += 8;


        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            9
        );

        doc.setTextColor(
            110,
            110,
            110
        );

        doc.text(
            "AI-powered execution plan",
            margin,
            y
        );


        y += 12;


        /*
         * GOAL
         */

        doc.setTextColor(
            30,
            30,
            30
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            16
        );


        const goalLines =
            doc.splitTextToSize(
                currentPlan.goal ||
                "Execution Plan",
                contentWidth
            );


        checkPageBreak(
            goalLines.length * 7 + 10
        );


        doc.text(
            goalLines,
            margin,
            y
        );


        y +=
            goalLines.length * 7 +
            7;


        /*
         * SUMMARY
         */

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            10
        );

        doc.setTextColor(
            90,
            90,
            90
        );


        const summaryLines =
            doc.splitTextToSize(
                currentPlan.summary ||
                "",
                contentWidth
            );


        checkPageBreak(
            summaryLines.length * 5 +
            8
        );


        doc.text(
            summaryLines,
            margin,
            y
        );


        y +=
            summaryLines.length * 5 +
            8;


        /*
         * PLAN INFORMATION
         */

        doc.setTextColor(
            30,
            30,
            30
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            10
        );


        const deadline =
            currentPlan.deadline ||
            "Not specified";


        const priority =
            (
                currentPlan.priority ||
                "medium"
            ).toUpperCase();


        const tasks =
            Array.isArray(
                currentPlan.tasks
            )
                ? currentPlan.tasks
                : [];


        const criticalPath =
            Array.isArray(
                currentPlan.critical_path
            )
                ? currentPlan.critical_path
                : [];


        doc.text(
            `Deadline: ${deadline}`,
            margin,
            y
        );


        doc.text(
            `Priority: ${priority}`,
            margin + 65,
            y
        );


        y += 7;


        doc.text(
            `Tasks: ${tasks.length}`,
            margin,
            y
        );


        doc.text(
            `Critical Path: ${criticalPath.length}`,
            margin + 65,
            y
        );


        y += 12;


        /*
         * EXECUTION PATH
         */

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            15
        );

        doc.setTextColor(
            30,
            30,
            30
        );


        checkPageBreak(
            15
        );


        doc.text(
            "Execution Path",
            margin,
            y
        );


        y += 8;


        tasks.forEach(
            (task, index) => {

                const title =
                    task.title ||
                    "Untitled task";


                const description =
                    task.description ||
                    "";


                const taskText =
                    `${index + 1}. ${title}`;


                const titleLines =
                    doc.splitTextToSize(
                        taskText,
                        contentWidth
                    );


                const descriptionLines =
                    doc.splitTextToSize(
                        description,
                        contentWidth - 4
                    );


                const requiredHeight =
                    titleLines.length * 6 +
                    descriptionLines.length * 5 +
                    14;


                checkPageBreak(
                    requiredHeight
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(
                    11
                );

                doc.setTextColor(
                    30,
                    30,
                    30
                );


                doc.text(
                    titleLines,
                    margin,
                    y
                );


                y +=
                    titleLines.length * 6 +
                    2;


                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(
                    9
                );

                doc.setTextColor(
                    95,
                    95,
                    95
                );


                doc.text(
                    descriptionLines,
                    margin + 4,
                    y
                );


                y +=
                    descriptionLines.length * 5 +
                    2;


                doc.setFontSize(
                    8
                );

                doc.setTextColor(
                    120,
                    120,
                    120
                );


                const taskPriority =
                    (
                        task.priority ||
                        "medium"
                    ).toUpperCase();


                const taskTime =
                    task.estimated_minutes ||
                    0;


                doc.text(
                    `${taskPriority}  •  ${taskTime} min`,
                    margin + 4,
                    y
                );


                y += 8;

            }
        );


        /*
         * STRATEGIC INSIGHT
         */

        checkPageBreak(
            35
        );


        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            14
        );

        doc.setTextColor(
            30,
            30,
            30
        );


        doc.text(
            "AI Strategic Insight",
            margin,
            y
        );


        y += 7;


        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            9
        );

        doc.setTextColor(
            95,
            95,
            95
        );


        const insightLines =
            doc.splitTextToSize(
                currentPlan.insight ||
                "",
                contentWidth
            );


        doc.text(
            insightLines,
            margin,
            y
        );


        y +=
            insightLines.length * 5 +
            10;


        /*
         * FOOTER
         */

        doc.setFontSize(
            8
        );

        doc.setTextColor(
            130,
            130,
            130
        );


        doc.text(
            "Generated by ActionForge",
            margin,
            pageHeight - 10
        );


        const filename =
            "ActionForge-Execution-Plan.pdf";


        doc.save(
            filename
        );


    }
    catch (error) {

        console.error(
            "PDF ERROR:",
            error
        );


        showError(
            "Unable to generate the PDF."
        );

    }
    finally {

        if (pdfBtn) {

            pdfBtn.disabled =
                false;

            pdfBtn.classList.remove(
                "loading"
            );


            if (
                pdfBtn.dataset.originalText
            ) {

                pdfBtn.innerHTML =
                    pdfBtn.dataset.originalText;

                delete pdfBtn.dataset.originalText;

            }

        }

    }

}


/* =========================================================
   PDF BUTTON
   ========================================================= */

if (pdfBtn) {

    pdfBtn.addEventListener(
        "click",
        downloadPlanPDF
    );

}


/* =========================================================
   NEW PLAN
   ========================================================= */

newPlanBtn.addEventListener(
    "click",
    () => {

        currentPlan =
            null;


        goalInput.value =
            "";


        problemInput.value =
            "";


        charCount.textContent =
            "0 / 5000";


        planSection.classList.add(
            "hidden"
        );


        hero.classList.remove(
            "hidden"
        );


        clearError();


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }
);


/* =========================================================
   ENTER KEY
   ========================================================= */

goalInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            (event.ctrlKey ||
             event.metaKey)
        ) {

            generateBtn.click();

        }

    }
);
