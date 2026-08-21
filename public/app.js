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

const downloadPdfBtn =
    document.getElementById("downloadPdfBtn");

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
    loading
) {

    if (loading) {

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

        }

    }

}


/* =========================================================
   CHARACTER COUNT
   ========================================================= */

goalInput.addEventListener(
    "input",
    () => {

        charCount.textContent =
            `${goalInput.value.length} / 5000`;

    }
);


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

    currentPlan = plan;


    document.getElementById(
        "goalTitle"
    ).textContent =
        plan.goal || "Your goal";


    document.getElementById(
        "summary"
    ).textContent =
        plan.summary || "";


    document.getElementById(
        "priority"
    ).textContent =
        (plan.priority || "medium")
            .toUpperCase();


    document.getElementById(
        "deadline"
    ).textContent =
        plan.deadline || "Not specified";


    const tasks =
        Array.isArray(plan.tasks)
            ? plan.tasks
            : [];


    document.getElementById(
        "taskCount"
    ).textContent =
        tasks.length;


    const criticalPath =
        Array.isArray(plan.critical_path)
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
        document.getElementById("tasks");


    tasksContainer.innerHTML = "";


    tasks.forEach(
        (task, index) => {

            const card =
                document.createElement("div");


            card.className =
                "task";


            const number =
                document.createElement("div");

            number.className =
                "task-number";

            number.textContent =
                index + 1;


            const content =
                document.createElement("div");

            content.className =
                "task-content";


            const title =
                document.createElement("h4");

            title.textContent =
                task.title || "Untitled task";


            const description =
                document.createElement("p");

            description.textContent =
                task.description || "";


            const meta =
                document.createElement("div");

            meta.className =
                "task-meta";


            const priority =
                document.createElement("span");

            priority.textContent =
                task.priority || "medium";


            const time =
                document.createElement("span");

            time.textContent =
                `${task.estimated_minutes || 0} min`;


            meta.appendChild(priority);

            meta.appendChild(time);


            content.appendChild(title);

            content.appendChild(description);

            content.appendChild(meta);


            card.appendChild(number);

            card.appendChild(content);


            tasksContainer.appendChild(card);

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


        showLoading(true);


        try {

            const response =
                await fetch(
                    "/.netlify/functions/plan",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                goal
                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to generate plan."
                );

            }


            renderPlan(data);


        }
        catch (error) {

            hero.classList.remove(
                "hidden"
            );

            showError(
                error.message
            );

        }
        finally {

            showLoading(false);

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


        showLoading(true);


        try {

            const response =
                await fetch(
                    "/.netlify/functions/replan",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
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
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to replan."
                );

            }


            renderPlan(
                data.updated_plan
            );


            renderChanges(
                data.changes
            );


            problemInput.value = "";


        }
        catch (error) {

            showError(
                error.message
            );

        }
        finally {

            showLoading(false);

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

function renderChanges(changes) {

    const section =
        document.getElementById(
            "changesSection"
        );


    const container =
        document.getElementById(
            "changes"
        );


    container.innerHTML = "";


    if (
        !Array.isArray(changes) ||
        changes.length === 0
    ) {

        section.classList.add(
            "hidden"
        );

        return;

    }


    changes.forEach(change => {

        const item =
            document.createElement("div");

        item.className =
            "change";

        item.textContent =
            change;

        container.appendChild(item);

    });


    section.classList.remove(
        "hidden"
    );

}


/* =========================================================
   PDF EXPORT
   ========================================================= */

async function downloadPlanAsPDF() {

    clearError();


    if (!currentPlan) {

        showError(
            "Create a plan before downloading a PDF."
        );

        return;

    }


    /*
     * jsPDF is loaded from the CDN in index.html.
     */

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showError(
            "The PDF system is still loading. Please try again in a moment."
        );

        return;

    }


    setButtonLoading(
        downloadPdfBtn,
        true
    );


    try {

        const {
            jsPDF
        } = window.jspdf;


        const pdf =
            new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });


        const pageWidth =
            pdf.internal.pageSize.getWidth();

        const pageHeight =
            pdf.internal.pageSize.getHeight();


        const margin = 18;

        const contentWidth =
            pageWidth - (margin * 2);


        let y = margin;


        /* =================================================
           PDF HELPERS
           ================================================= */

        function ensureSpace(requiredHeight) {

            if (
                y + requiredHeight >
                pageHeight - margin
            ) {

                pdf.addPage();

                y = margin;

            }

        }


        function addWrappedText(
            text,
            x,
            currentY,
            maxWidth,
            fontSize = 10,
            lineHeight = 5
        ) {

            pdf.setFontSize(fontSize);

            const lines =
                pdf.splitTextToSize(
                    String(text || ""),
                    maxWidth
                );


            pdf.text(
                lines,
                x,
                currentY
            );


            return currentY +
                (lines.length * lineHeight);

        }


        function addFooter() {

            const totalPages =
                pdf.internal.getNumberOfPages();


            for (
                let page = 1;
                page <= totalPages;
                page++
            ) {

                pdf.setPage(page);

                pdf.setFontSize(8);

                pdf.setTextColor(
                    130,
                    130,
                    130
                );


                pdf.text(
                    "ActionForge — AI-powered execution planning",
                    margin,
                    pageHeight - 9
                );


                pdf.text(
                    `Page ${page} of ${totalPages}`,
                    pageWidth - margin,
                    pageHeight - 9,
                    {
                        align: "right"
                    }
                );

            }


            pdf.setTextColor(
                20,
                20,
                20
            );

        }


        /* =================================================
           HEADER
           ================================================= */

        pdf.setFillColor(
            8,
            9,
            13
        );


        pdf.rect(
            0,
            0,
            pageWidth,
            30,
            "F"
        );


        pdf.setTextColor(
            184,
            255,
            90
        );


        pdf.setFontSize(20);

        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.text(
            "ACTIONFORGE",
            margin,
            19
        );


        pdf.setTextColor(
            255,
            255,
            255
        );


        pdf.setFontSize(9);

        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.text(
            "AI EXECUTION PLAN",
            pageWidth - margin,
            18,
            {
                align: "right"
            }
        );


        y = 43;


        /* =================================================
           GOAL
           ================================================= */

        pdf.setTextColor(
            20,
            20,
            20
        );


        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.setFontSize(9);

        pdf.setTextColor(
            120,
            120,
            120
        );


        pdf.text(
            "EXECUTION PLAN",
            margin,
            y
        );


        y += 8;


        pdf.setTextColor(
            20,
            20,
            20
        );


        pdf.setFontSize(22);


        const goal =
            currentPlan.goal ||
            "Your goal";


        const goalLines =
            pdf.splitTextToSize(
                goal,
                contentWidth
            );


        ensureSpace(
            goalLines.length * 9 + 20
        );


        pdf.text(
            goalLines,
            margin,
            y
        );


        y +=
            goalLines.length * 9 +
            5;


        /* =================================================
           SUMMARY
           ================================================= */

        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.setFontSize(10);

        pdf.setTextColor(
            95,
            95,
            95
        );


        y =
            addWrappedText(
                currentPlan.summary ||
                    "",
                margin,
                y,
                contentWidth,
                10,
                5
            );


        y += 8;


        /* =================================================
           STATS
           ================================================= */

        ensureSpace(30);


        const statsY = y;

        const statWidth =
            contentWidth / 3;


        pdf.setFillColor(
            244,
            245,
            246
        );


        pdf.roundedRect(
            margin,
            statsY,
            contentWidth,
            24,
            3,
            3,
            "F"
        );


        const stats = [

            {
                label: "PRIORITY",
                value:
                    (
                        currentPlan.priority ||
                        "medium"
                    ).toUpperCase()
            },

            {
                label: "DEADLINE",
                value:
                    currentPlan.deadline ||
                    "Not specified"
            },

            {
                label: "TASKS",
                value:
                    Array.isArray(
                        currentPlan.tasks
                    )
                        ? String(
                            currentPlan.tasks.length
                        )
                        : "0"
            }

        ];


        stats.forEach(
            (stat, index) => {

                const x =
                    margin +
                    (index * statWidth) +
                    6;


                pdf.setFont(
                    "helvetica",
                    "bold"
                );

                pdf.setFontSize(7);

                pdf.setTextColor(
                    120,
                    120,
                    120
                );


                pdf.text(
                    stat.label,
                    x,
                    statsY + 8
                );


                pdf.setFont(
                    "helvetica",
                    "normal"
                );

                pdf.setFontSize(9);

                pdf.setTextColor(
                    20,
                    20,
                    20
                );


                const valueLines =
                    pdf.splitTextToSize(
                        String(stat.value),
                        statWidth - 12
                    );


                pdf.text(
                    valueLines,
                    x,
                    statsY + 16
                );

            }
        );


        y += 34;


        /* =================================================
           TASKS HEADER
           ================================================= */

        ensureSpace(25);


        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(15);

        pdf.setTextColor(
            20,
            20,
            20
        );


        pdf.text(
            "Execution Path",
            margin,
            y
        );


        y += 9;


        const tasks =
            Array.isArray(
                currentPlan.tasks
            )
                ? currentPlan.tasks
                : [];


        /* =================================================
           TASKS
           ================================================= */

        tasks.forEach(
            (task, index) => {

                const title =
                    task.title ||
                    "Untitled task";


                const description =
                    task.description ||
                    "";


                const priority =
                    (
                        task.priority ||
                        "medium"
                    ).toUpperCase();


                const minutes =
                    task.estimated_minutes ||
                    0;


                const dependencies =
                    Array.isArray(
                        task.dependencies
                    )
                        ? task.dependencies
                        : [];


                const titleLines =
                    pdf.splitTextToSize(
                        title,
                        contentWidth - 18
                    );


                const descriptionLines =
                    pdf.splitTextToSize(
                        description,
                        contentWidth - 18
                    );


                const dependencyText =
                    dependencies.length
                        ? `Dependencies: ${dependencies.join(", ")}`
                        : "No dependencies";


                const estimatedHeight =
                    17 +
                    (titleLines.length * 5) +
                    (descriptionLines.length * 4.5) +
                    9;


                ensureSpace(
                    estimatedHeight
                );


                /* Task background */

                pdf.setFillColor(
                    247,
                    248,
                    249
                );


                pdf.roundedRect(
                    margin,
                    y,
                    contentWidth,
                    estimatedHeight,
                    3,
                    3,
                    "F"
                );


                /* Task number */

                pdf.setFillColor(
                    25,
                    25,
                    25
                );


                pdf.circle(
                    margin + 7,
                    y + 8,
                    4,
                    "F"
                );


                pdf.setTextColor(
                    255,
                    255,
                    255
                );


                pdf.setFont(
                    "helvetica",
                    "bold"
                );


                pdf.setFontSize(7);


                pdf.text(
                    String(index + 1),
                    margin + 7,
                    y + 10.2,
                    {
                        align: "center"
                    }
                );


                /* Title */

                pdf.setTextColor(
                    20,
                    20,
                    20
                );


                pdf.setFontSize(11);


                pdf.text(
                    titleLines,
                    margin + 15,
                    y + 8
                );


                let taskY =
                    y +
                    8 +
                    (titleLines.length * 5) +
                    2;


                /* Description */

                pdf.setFont(
                    "helvetica",
                    "normal"
                );


                pdf.setFontSize(8.5);

                pdf.setTextColor(
                    85,
                    85,
                    85
                );


                pdf.text(
                    descriptionLines,
                    margin + 15,
                    taskY
                );


                taskY +=
                    descriptionLines.length *
                    4.5;


                taskY += 4;


                /* Meta */

                pdf.setFontSize(7);

                pdf.setTextColor(
                    110,
                    110,
                    110
                );


                pdf.text(
                    `${priority}  •  ${minutes} min  •  ${dependencyText}`,
                    margin + 15,
                    taskY
                );


                y +=
                    estimatedHeight +
                    5;

            }
        );


        /* =================================================
           CRITICAL PATH
           ================================================= */

        const criticalPath =
            Array.isArray(
                currentPlan.critical_path
            )
                ? currentPlan.critical_path
                : [];


        if (
            criticalPath.length > 0
        ) {

            ensureSpace(35);


            pdf.setFont(
                "helvetica",
                "bold"
            );

            pdf.setFontSize(13);

            pdf.setTextColor(
                20,
                20,
                20
            );


            pdf.text(
                "Critical Path",
                margin,
                y
            );


            y += 7;


            pdf.setFont(
                "helvetica",
                "normal"
            );

            pdf.setFontSize(9);

            pdf.setTextColor(
                80,
                80,
                80
            );


            y =
                addWrappedText(
                    criticalPath.join(
                        " → "
                    ),
                    margin,
                    y,
                    contentWidth,
                    9,
                    5
                );


            y += 8;

        }


        /* =================================================
           AI INSIGHT
           ================================================= */

        ensureSpace(45);


        pdf.setFillColor(
            242,
            248,
            236
        );


        const insight =
            currentPlan.insight ||
            "Focus on the highest-impact action first.";


        const insightLines =
            pdf.splitTextToSize(
                insight,
                contentWidth - 12
            );


        const insightHeight =
            25 +
            (insightLines.length * 5);


        pdf.roundedRect(
            margin,
            y,
            contentWidth,
            insightHeight,
            3,
            3,
            "F"
        );


        pdf.setTextColor(
            70,
            120,
            20
        );


        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(8);


        pdf.text(
            "AI STRATEGIC INSIGHT",
            margin + 6,
            y + 9
        );


        pdf.setTextColor(
            70,
            70,
            70
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(9);


        pdf.text(
            insightLines,
            margin + 6,
            y + 17
        );


        y +=
            insightHeight +
            10;


        /* =================================================
           REPLAN STATUS
           ================================================= */

        if (
            Array.isArray(
                currentPlan.assumptions
            ) &&
            currentPlan.assumptions.length > 0
        ) {

            ensureSpace(35);


            pdf.setFont(
                "helvetica",
                "bold"
            );

            pdf.setFontSize(11);

            pdf.setTextColor(
                20,
                20,
                20
            );


            pdf.text(
                "Assumptions",
                margin,
                y
            );


            y += 6;


            pdf.setFont(
                "helvetica",
                "normal"
            );

            pdf.setFontSize(8.5);

            pdf.setTextColor(
                90,
                90,
                90
            );


            currentPlan.assumptions.forEach(
                assumption => {

                    const lines =
                        pdf.splitTextToSize(
                            `• ${assumption}`,
                            contentWidth
                        );


                    ensureSpace(
                        lines.length * 5
                    );


                    pdf.text(
                        lines,
                        margin,
                        y
                    );


                    y +=
                        lines.length * 5 +
                        2;

                }
            );

        }


        /* =================================================
           FOOTER
           ================================================= */

        addFooter();


        /* =================================================
           DOWNLOAD
           ================================================= */

        const safeGoal =
            String(
                currentPlan.goal ||
                "actionforge-plan"
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                )
                .substring(
                    0,
                    50
                );


        const filename =
            `${safeGoal || "actionforge-plan"}.pdf`;


        pdf.save(filename);


    }
    catch (error) {

        console.error(
            "PDF generation error:",
            error
        );


        showError(
            "Unable to generate the PDF. Please try again."
        );

    }
    finally {

        setButtonLoading(
            downloadPdfBtn,
            false
        );

    }

}


/* =========================================================
   PDF BUTTON
   ========================================================= */

if (downloadPdfBtn) {

    downloadPdfBtn.addEventListener(
        "click",
        downloadPlanAsPDF
    );

}


/* =========================================================
   NEW PLAN
   ========================================================= */

newPlanBtn.addEventListener(
    "click",
    () => {

        currentPlan = null;

        goalInput.value = "";

        problemInput.value = "";

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
            (event.ctrlKey || event.metaKey)
        ) {

            generateBtn.click();

        }

    }
);
