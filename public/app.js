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

const loadingTitle =
    document.getElementById("loadingTitle");

const loadingText =
    document.getElementById("loadingText");

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

function showLoading(show, title, text) {

    loading.classList.toggle(
        "hidden",
        !show
    );

    if (title) {
        loadingTitle.textContent = title;
    }

    if (text) {
        loadingText.textContent = text;
    }
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

        }

    }

}


/* =========================================================
   SAFE JSON RESPONSE
   ========================================================= */

async function readResponse(response) {

    const text =
        await response.text();

    if (!text) {

        throw new Error(
            `Server returned an empty response (${response.status}).`
        );

    }


    try {

        return JSON.parse(text);

    } catch {

        console.error(
            "NON-JSON SERVER RESPONSE:",
            text
        );

        if (
            text.includes("Inactivity Timeout")
        ) {

            throw new Error(
                "The AI service took too long to respond. Please try Adapt My Plan again."
            );

        }

        if (
            text.includes("<HTML") ||
            text.includes("<html")
        ) {

            throw new Error(
                "The server returned an unexpected HTML response. Please try again."
            );

        }

        throw new Error(
            `Server returned an unexpected response: ${text.substring(0, 250)}`
        );

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
                task.title ||
                "Untitled task";


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
                task.priority ||
                "medium";


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


        showLoading(
            true,
            "Forging your execution plan...",
            "Breaking the goal into actionable steps."
        );


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
                await readResponse(response);


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
                error.message ||
                "Unable to generate plan."
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


        showLoading(
            true,
            "Adapting your plan...",
            "Recalculating priorities and dependencies."
        );


        try {

            const controller =
                new AbortController();


            const timeout =
                setTimeout(
                    () => controller.abort(),
                    30000
                );


            let response;


            try {

                response =
                    await fetch(
                        "/.netlify/functions/replan",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            signal:
                                controller.signal,

                            body:
                                JSON.stringify({

                                    plan:
                                        currentPlan,

                                    problem

                                })

                        }
                    );

            }
            finally {

                clearTimeout(timeout);

            }


            const data =
                await readResponse(response);


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to adapt the plan."
                );

            }


            if (
                !data.updated_plan
            ) {

                throw new Error(
                    "The AI returned an incomplete adapted plan."
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

            if (
                error.name === "AbortError"
            ) {

                showError(
                    "The adaptation request took too long. Please try again."
                );

            } else {

                showError(
                    error.message ||
                    "Unable to adapt the plan."
                );

            }

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
            typeof change === "string"
                ? change
                : JSON.stringify(change);


        container.appendChild(item);

    });


    section.classList.remove(
        "hidden"
    );

}


/* =========================================================
   PDF EXPORT
   ========================================================= */

downloadPdfBtn.addEventListener(
    "click",
    async () => {

        if (!currentPlan) {

            showError(
                "Create a plan before downloading the PDF."
            );

            return;

        }


        setButtonLoading(
            downloadPdfBtn,
            true
        );


        try {

            await generatePlanPDF();

        }
        catch (error) {

            console.error(
                "PDF ERROR:",
                error
            );

            showError(
                "Unable to create the PDF. Opening the print version instead."
            );

            window.print();

        }
        finally {

            setButtonLoading(
                downloadPdfBtn,
                false
            );

        }

    }
);


/* =========================================================
   PDF GENERATOR
   ========================================================= */

async function generatePlanPDF() {

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        window.print();

        return;

    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });


    const pageWidth =
        doc.internal.pageSize.getWidth();

    const pageHeight =
        doc.internal.pageSize.getHeight();


    const margin = 16;

    let y = 18;


    /* =====================================================
       COLORS
       ===================================================== */

    const BG = [
        8,
        9,
        13
    ];

    const SURFACE = [
        16,
        18,
        24
    ];

    const SURFACE2 = [
        21,
        24,
        32
    ];

    const TEXT = [
        243,
        245,
        247
    ];

    const MUTED = [
        140,
        147,
        161
    ];

    const ACCENT = [
        184,
        255,
        90
    ];


    /* =====================================================
       BACKGROUND
       ===================================================== */

    doc.setFillColor(
        ...BG
    );

    doc.rect(
        0,
        0,
        pageWidth,
        pageHeight,
        "F"
    );


    /* =====================================================
       LOGO
       ===================================================== */

    let logoData = null;


    try {

        logoData =
            await imageToDataURL(
                "/actionforge-logo.png"
            );

    }
    catch (error) {

        console.warn(
            "Logo could not be loaded:",
            error
        );

    }


    if (logoData) {

        doc.addImage(
            logoData,
            "PNG",
            margin,
            y,
            16,
            16
        );

    }


    const brandX =
        logoData
            ? margin + 21
            : margin;


    doc.setTextColor(
        ...TEXT
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(16);

    doc.text(
        "ActionForge",
        brandX,
        y + 7
    );


    doc.setTextColor(
        ...MUTED
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(8);

    doc.text(
        "TURN INTENTIONS INTO EXECUTION",
        brandX,
        y + 12
    );


    doc.setTextColor(
        ...ACCENT
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(7);

    doc.text(
        "AI EXECUTION PLAN",
        pageWidth - margin,
        y + 7,
        {
            align: "right"
        }
    );


    y += 28;


    /* =====================================================
       TITLE
       ===================================================== */

    doc.setTextColor(
        ...ACCENT
    );

    doc.setFontSize(8);

    doc.text(
        "EXECUTION PLAN",
        margin,
        y
    );


    y += 8;


    doc.setTextColor(
        ...TEXT
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(24);


    const titleLines =
        doc.splitTextToSize(
            currentPlan.goal ||
            "Your Goal",
            pageWidth - margin * 2
        );


    doc.text(
        titleLines,
        margin,
        y
    );


    y +=
        titleLines.length *
        10;


    /* =====================================================
       SUMMARY
       ===================================================== */

    if (currentPlan.summary) {

        y += 3;


        doc.setTextColor(
            ...MUTED
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(10);


        const summaryLines =
            doc.splitTextToSize(
                currentPlan.summary,
                pageWidth - margin * 2
            );


        doc.text(
            summaryLines,
            margin,
            y
        );


        y +=
            summaryLines.length *
            5.5;

    }


    y += 8;


    /* =====================================================
       META CARDS
       ===================================================== */

    const cardGap = 4;

    const cardWidth =
        (
            pageWidth -
            margin * 2 -
            cardGap * 2
        ) / 3;


    const stats = [

        [
            "DEADLINE",
            currentPlan.deadline ||
            "Not specified"
        ],

        [
            "TASKS",
            String(
                Array.isArray(
                    currentPlan.tasks
                )
                    ? currentPlan.tasks.length
                    : 0
            )
        ],

        [
            "CRITICAL PATH",
            String(
                Array.isArray(
                    currentPlan.critical_path
                )
                    ? currentPlan.critical_path.length
                    : 0
            )
        ]

    ];


    stats.forEach(
        (stat, index) => {

            const x =
                margin +
                index *
                (cardWidth + cardGap);


            doc.setFillColor(
                ...SURFACE
            );


            doc.roundedRect(
                x,
                y,
                cardWidth,
                22,
                3,
                3,
                "F"
            );


            doc.setTextColor(
                ...MUTED
            );

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(6.5);


            doc.text(
                stat[0],
                x + 5,
                y + 7
            );


            doc.setTextColor(
                ...TEXT
            );

            doc.setFontSize(10);

            doc.text(
                stat[1],
                x + 5,
                y + 15
            );

        }
    );


    y += 31;


    /* =====================================================
       PRIORITY
       ===================================================== */

    doc.setFillColor(
        30,
        42,
        22
    );


    doc.roundedRect(
        margin,
        y,
        32,
        9,
        2,
        2,
        "F"
    );


    doc.setTextColor(
        ...ACCENT
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(7);


    doc.text(
        (
            currentPlan.priority ||
            "medium"
        ).toUpperCase(),
        margin + 16,
        y + 6,
        {
            align: "center"
        }
    );


    y += 18;


    /* =====================================================
       TASK SECTION
       ===================================================== */

    doc.setTextColor(
        ...ACCENT
    );

    doc.setFontSize(7);

    doc.text(
        "STEP-BY-STEP",
        margin,
        y
    );


    y += 7;


    doc.setTextColor(
        ...TEXT
    );

    doc.setFontSize(15);

    doc.text(
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


    for (
        let i = 0;
        i < tasks.length;
        i++
    ) {

        const task =
            tasks[i];


        const description =
            task.description ||
            "";


        const title =
            task.title ||
            "Untitled task";


        const estimated =
            task.estimated_minutes ||
            0;


        const priority =
            (
                task.priority ||
                "medium"
            ).toUpperCase();


        const descLines =
            doc.splitTextToSize(
                description,
                pageWidth -
                margin * 2 -
                22
            );


        const taskHeight =
            17 +
            Math.max(
                1,
                descLines.length
            ) * 4.5;


        /* New page if necessary */

        if (
            y + taskHeight >
            pageHeight - 20
        ) {

            addPdfPage(
                doc,
                BG,
                pageWidth,
                pageHeight
            );

            y = 20;

        }


        /* Task background */

        doc.setFillColor(
            ...SURFACE
        );


        doc.roundedRect(
            margin,
            y,
            pageWidth - margin * 2,
            taskHeight,
            3,
            3,
            "F"
        );


        /* Number */

        doc.setFillColor(
            ...SURFACE2
        );


        doc.roundedRect(
            margin + 5,
            y + 5,
            10,
            10,
            2,
            2,
            "F"
        );


        doc.setTextColor(
            ...ACCENT
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(8);


        doc.text(
            String(i + 1),
            margin + 10,
            y + 11.5,
            {
                align: "center"
            }
        );


        /* Title */

        doc.setTextColor(
            ...TEXT
        );

        doc.setFontSize(9);

        doc.text(
            title,
            margin + 21,
            y + 8
        );


        /* Description */

        doc.setTextColor(
            ...MUTED
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(7.5);


        doc.text(
            descLines,
            margin + 21,
            y + 13
        );


        /* Meta */

        doc.setTextColor(
            ...ACCENT
        );

        doc.setFontSize(6.5);


        doc.text(
            `${priority}  •  ${estimated} MIN`,
            pageWidth - margin - 5,
            y + 8,
            {
                align: "right"
            }
        );


        y +=
            taskHeight + 4;

    }


    /* =====================================================
       AI INSIGHT
       ===================================================== */

    const insight =
        currentPlan.insight ||
        "";


    if (insight) {

        const insightLines =
            doc.splitTextToSize(
                insight,
                pageWidth -
                margin * 2 -
                20
            );


        const insightHeight =
            17 +
            insightLines.length *
            4.5;


        if (
            y + insightHeight >
            pageHeight - 20
        ) {

            addPdfPage(
                doc,
                BG,
                pageWidth,
                pageHeight
            );

            y = 20;

        }


        doc.setFillColor(
            21,
            30,
            17
        );


        doc.roundedRect(
            margin,
            y,
            pageWidth - margin * 2,
            insightHeight,
            3,
            3,
            "F"
        );


        doc.setTextColor(
            ...ACCENT
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(7);


        doc.text(
            "AI STRATEGIC INSIGHT",
            margin + 8,
            y + 8
        );


        doc.setTextColor(
            ...MUTED
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(7.5);


        doc.text(
            insightLines,
            margin + 8,
            y + 14
        );

    }


    /* =====================================================
       FOOTER
       ===================================================== */

    const totalPages =
        doc.internal.getNumberOfPages();


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        doc.setPage(page);


        doc.setDrawColor(
            45,
            48,
            57
        );


        doc.line(
            margin,
            pageHeight - 12,
            pageWidth - margin,
            pageHeight - 12
        );


        doc.setTextColor(
            ...MUTED
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(6.5);


        doc.text(
            "ActionForge • AI-powered execution planning",
            margin,
            pageHeight - 7
        );


        doc.text(
            `PAGE ${page} / ${totalPages}`,
            pageWidth - margin,
            pageHeight - 7,
            {
                align: "right"
            }
        );

    }


    /* =====================================================
       DOWNLOAD
       ===================================================== */

    const safeName =
        (
            currentPlan.goal ||
            "actionforge-plan"
        )
        .replace(
            /[^a-z0-9]+/gi,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        )
        .toLowerCase();


    doc.save(
        `actionforge-${safeName || "plan"}.pdf`
    );

}


/* =========================================================
   PDF PAGE HELPER
   ========================================================= */

function addPdfPage(
    doc,
    bg,
    width,
    height
) {

    doc.addPage();


    doc.setFillColor(
        ...bg
    );


    doc.rect(
        0,
        0,
        width,
        height,
        "F"
    );

}


/* =========================================================
   IMAGE → DATA URL
   ========================================================= */

function imageToDataURL(
    url
) {

    return new Promise(
        (resolve, reject) => {

            const image =
                new Image();


            image.onload =
                () => {

                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        image.naturalWidth;

                    canvas.height =
                        image.naturalHeight;


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        image,
                        0,
                        0
                    );


                    resolve(
                        canvas.toDataURL(
                            "image/png"
                        )
                    );

                };


            image.onerror =
                reject;


            image.src =
                `${url}?v=${Date.now()}`;

        }
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
