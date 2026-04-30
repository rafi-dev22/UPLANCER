# UPLANCER AI 🚀

UPLANCER AI is a next-generation, verified IT freelance platform powered by Artificial Intelligence. Designed to connect global clients with highly qualified tech professionals, UPLANCER AI strictly evaluates freelancers using advanced AI models based on their CVs and real-time GitHub activity.

## ✨ Key Features

- **🤖 AI Freelancer Verification:** Automatically evaluates a freelancer's CV and GitHub profile to generate a global readiness score, ensuring only highly-qualified professionals pass the verification stage.
- **📈 Skill Gap & Improvement Insights:** Provides strict, constructive feedback, identifying missing skills and generating a personalized roadmap for freelancer improvement.
- **💼 AI Job Matching:** Dynamically matches verified freelancers to the most relevant job roles based on their extracted skills and experience.
- **💰 AI Pricing Advisor:** Evaluates freelancer pricing proposals against global market standards to suggest whether their rate is too low, appropriate, or too high.
- **🔒 Secure Architecture:** Implements a robust Node.js/Express backend proxy to securely communicate with Azure OpenAI and the GitHub API, ensuring sensitive API keys are never exposed to the client.

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3 (Modern Glassmorphism UI), Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Integrations:**
  - [Azure OpenAI Service](https://azure.microsoft.com/en-us/products/ai-services/openai-service) (via `@azure/openai` SDK)
  - [GitHub REST API](https://docs.github.com/en/rest)

## 📁 Project Structure

```text
UPLANCER/
├── backend/                  # Secure proxy server
│   ├── .env                  # Environment variables (API Keys)
│   ├── package.json          # Backend dependencies
│   └── server.js             # Express.js API logic
├── script.js                 # Frontend application logic
├── style.css                 # UI Styling and animations
├── uplancer.html             # Main entry point / UI markup
└── README.md                 # Project documentation
```

## 🚀 Getting Started

Follow these steps to set up and run UPLANCER AI locally on your machine.

### 1. Backend Setup (Crucial for Security)
The backend acts as a secure proxy to prevent your API keys from being stolen.

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd UPLANCER/backend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `backend/` folder and insert your credentials:
   ```env
   # Azure OpenAI Credentials
   AZURE_OPENAI_ENDPOINT="https://your-resource-name.openai.azure.com"
   AZURE_OPENAI_KEY="your-azure-api-key"
   AZURE_OPENAI_DEPLOYMENT_ID="your-deployment-name"
   
   # GitHub Token (To prevent 403 Rate Limit errors)
   GITHUB_TOKEN="ghp_YOUR_GITHUB_PERSONAL_ACCESS_TOKEN"
   
   PORT=3000
   ```
4. Start the backend server:
   ```bash
   npm start
   ```

### 2. Frontend Setup
1. Ensure your backend server is running (`http://localhost:3000`).
2. Simply double-click `uplancer.html` to open it in your web browser. 
3. You're ready to go! Try registering as a freelancer, inserting your CV, and running the AI Evaluation.

## 🛡 Security Notes
- **Never** commit your `.env` file to version control.
- Ensure the `.gitignore` file in your backend folder contains `node_modules/` and `.env`.

---
*Built to elevate the global standard of IT freelancing.*
