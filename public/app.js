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
