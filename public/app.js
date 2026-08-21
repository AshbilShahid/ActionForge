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


            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            if (!contentType.includes(
                "application/json"
            )) {

                const raw =
                    await response.text();

                throw new Error(
                    `Server returned an unexpected response: ${raw.substring(0, 200)}`
                );

            }


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


            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            if (!contentType.includes(
                "application/json"
            )) {

                const raw =
                    await response.text();

                throw new Error(
                    `Server returned an unexpected response: ${raw.substring(0, 200)}`
                );

            }


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
                error.message ||
                "Unable to replan."
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
   PDF GENERATION
   ========================================================= */

function downloadPlanAsPDF() {

    if (!currentPlan) {

        showError(
            "Create a plan before downloading a PDF."
        );

        return;

    }


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showError(
            "PDF generator is unavailable. Please refresh the page and try again."
        );

        return;

    }


    const {
        jsPDF
    } = window.jspdf;


    const pdf =
        new jsPDF({
            unit: "mm",
            format: "a4"
        });


    const pageWidth =
        pdf.internal.pageSize.getWidth();


    const pageHeight =
        pdf.internal.pageSize.getHeight();


    const margin = 18;

    const contentWidth =
        pageWidth - margin * 2;


    let y = margin;


    /* =====================================================
       HELPERS
       ===================================================== */

    function ensureSpace(height) {

        if (
            y + height >
            pageHeight - margin
        ) {

            pdf.addPage();

            y = margin;

        }

    }


    function addWrappedText(
        text,
        x,
        startY,
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
            startY
        );


        return (
            startY +
            lines.length * lineHeight
        );

    }


    /* =====================================================
       HEADER
       ===================================================== */

    pdf.setFont(
        "helvetica",
        "bold"
    );


    pdf.setFontSize(22);


    pdf.text(
        "ActionForge",
        margin,
        y
    );


    y += 8;


    pdf.setFont(
        "helvetica",
        "normal"
    );


    pdf.setFontSize(9);


    pdf.text(
        "AI-powered execution planning",
        margin,
        y
    );


    y += 10;


    pdf.setDrawColor(
        210,
        210,
        210
    );


    pdf.line(
        margin,
        y,
        pageWidth - margin,
        y
    );


    y += 10;


    /* =====================================================
       GOAL
       ===================================================== */

    pdf.setFont(
        "helvetica",
        "bold"
    );


    pdf.setFontSize(9);


    pdf.text(
        "EXECUTION PLAN",
        margin,
        y
    );


    y += 7;


    pdf.setFontSize(18);


    y =
        addWrappedText(
            currentPlan.goal ||
            "Untitled goal",
            margin,
            y,
            contentWidth,
            18,
            7
        );


    y += 5;


    pdf.setFont(
        "helvetica",
        "normal"
    );


    pdf.setFontSize(10);


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


    /* =====================================================
       PLAN INFORMATION
       ===================================================== */

    ensureSpace(20);


    pdf.setFont(
        "helvetica",
        "bold"
    );


    pdf.setFontSize(9);


    pdf.text(
        `PRIORITY: ${(currentPlan.priority || "medium").toUpperCase()}`,
        margin,
        y
    );


    pdf.text(
        `DEADLINE: ${currentPlan.deadline || "Not specified"}`,
        margin + 60,
        y
    );


    y += 10;


    /* =====================================================
       TASKS
       ===================================================== */

    pdf.setFontSize(13);


    pdf.text(
        "Execution Path",
        margin,
        y
    );


    y += 8;


    const tasks =
        Array.isArray(currentPlan.tasks)
            ? currentPlan.tasks
            : [];


    tasks.forEach(
        (task, index) => {

            const title =
                `${index + 1}. ${task.title || "Untitled task"}`;


            const description =
                task.description || "";


            const estimated =
                task.estimated_minutes || 0;


            ensureSpace(30);


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(11);


            y =
                addWrappedText(
                    title,
                    margin,
                    y,
                    contentWidth,
                    11,
                    5
                );


            y += 1;


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(9);


            y =
                addWrappedText(
                    description,
                    margin + 5,
                    y,
                    contentWidth - 5,
                    9,
                    4.5
                );


            y += 2;


            pdf.setFontSize(8);


            pdf.text(
                `Priority: ${(task.priority || "medium").toUpperCase()}    Time: ${estimated} minutes`,
                margin + 5,
                y
            );


            y += 7;

        }
    );


    /* =====================================================
       STRATEGIC INSIGHT
       ===================================================== */

    ensureSpace(35);


    pdf.setFont(
        "helvetica",
        "bold"
    );


    pdf.setFontSize(13);


    pdf.text(
        "AI Strategic Insight",
        margin,
        y
    );


    y += 7;


    pdf.setFont(
        "helvetica",
        "normal"
    );


    pdf.setFontSize(9);


    y =
        addWrappedText(
            currentPlan.insight ||
            "",
            margin,
            y,
            contentWidth,
            9,
            4.5
        );


    y += 10;


    /* =====================================================
       FOOTER
       ===================================================== */

    const totalPages =
        pdf.internal.getNumberOfPages();


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        pdf.setPage(page);


        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.setFontSize(8);


        pdf.setTextColor(
            120,
            120,
            120
        );


        pdf.text(
            `ActionForge • Page ${page} of ${totalPages}`,
            margin,
            pageHeight - 10
        );

    }


    /* =====================================================
       DOWNLOAD
       ===================================================== */

    const safeName =
        String(
            currentPlan.goal ||
            "execution-plan"
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
                60
            );


    pdf.save(
        `actionforge-${safeName || "execution-plan"}.pdf`
    );

}


/* =========================================================
   PDF BUTTON
   ========================================================= */

downloadPdfBtn.addEventListener(
    "click",
    () => {

        clearError();

        downloadPlanAsPDF();

    }
);


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
            (event.ctrlKey ||
             event.metaKey)
        ) {

            generateBtn.click();

        }

    }
);
