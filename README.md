# ActionForge

<br />
<div align="center">
  <a href="https://actionforge.netlify.app">
    <img src="actionforge-logo.png" alt="Action Forge" width="320" height="auto">
  </a>
</div>

>Test out the app by clicking this Image.
# ⚡ ActionForge

> **Turn intentions into execution.**

ActionForge is an AI-powered execution planner that transforms vague goals into practical, prioritized, and adaptable action plans.

## ✦ Features

- 🧠 **AI Planning** — Turn goals into structured execution plans.
- 🎯 **Task Prioritization** — Identify what matters most.
- ⏱️ **Time Estimates** — Estimate the effort required for tasks.
- 🔗 **Dependencies** — Organize tasks in the correct order.
- 🛣️ **Critical Path** — Identify the most important tasks.
- 🔄 **Adaptive Planning** — Rebuild plans when circumstances change.
- 💡 **Strategic Insight** — Get focused AI recommendations.
- 📄 **PDF Export** — Download plans as polished PDF documents.
- 📱 **Responsive UI** — Works across desktop and mobile.

## 🧠 How It Works

**Goal → AI Analysis → Execution Plan → Execute → Something Changes → Adapt Plan → Continue**

Users describe what they want to accomplish. ActionForge uses **DeepSeek-V4-Flash** through the **B.AI API** to generate a structured execution plan.

If something changes during execution, users can describe the problem through **Reality Check**, and ActionForge adapts the existing plan.

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** JavaScript / ES Modules
- **Serverless Functions:** Netlify Functions
- **AI:** DeepSeek-V4-Flash via B.AI API
- **Deployment:** Netlify

## 📁 Project Structure

ActionForge/
- public/
  - index.html
  - style.css
  - app.js
  - actionforge-logo.png
  - favicon-actionforge-logo.png
- netlify/
  - functions/
    - plan.mjs
    - replan.mjs
- server/
  - ai.mjs
- package.json
- netlify.toml
- README.md

## 🚀 Run Locally

### 1. Clone the repository

    git clone https://github.com/AshbilShahid/actionforge.git
    cd actionforge

### 2. Install dependencies

    npm install

### 3. Configure the API key

Create a `.env` file or configure the environment variable through Netlify:

    AI_API_KEY=your_bai_api_key

**Never expose your API key in frontend files or commit it to GitHub.**

### 4. Run with Netlify

Install the Netlify CLI if you don't already have it:

    npm install -g netlify-cli

Start the local development server:

    netlify dev

Open the local URL shown in the terminal, usually:

    http://localhost:8888

## 🔌 API Functions

### Generate Plan

    POST /.netlify/functions/plan

### Adapt Plan

    POST /.netlify/functions/replan

Both functions communicate with the AI engine in `server/ai.mjs`.

## 🎨 Design

ActionForge uses a minimal dark interface with a lime-green accent, designed around one principle:

> **Less decoration. More execution.**

## ⚠️ Note

AI-generated plans are recommendations and should be reviewed by the user before execution.

## 👤 Author

**Ashbil Shahid**

## 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

---

> **Think. Plan. Adapt. Execute.**

© 2026 Ashbil Shahid
