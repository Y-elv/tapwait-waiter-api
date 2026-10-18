# TapWait AI

### Intelligent Restaurant Management, Service Coordination, and Marketing

**Manage restaurant operations. Coordinate waiter service. Turn menus into marketing opportunities with AI.**

TapWait AI is an intelligent restaurant management dashboard designed to help restaurant managers and owners oversee service operations, coordinate waiter requests, and create more effective promotional campaigns using artificial intelligence.

The platform brings restaurant operations and AI-assisted marketing into one connected experience. Managers can use the dashboard to support service coordination, while MenuBoost AI helps transform restaurant menus and selected offers into promotional content. Campaign Guard adds an experimental AI review capability to help identify potentially unclear or unsupported promotional claims.

TapWait AI aims to make practical digital tools more accessible to restaurants seeking better customer experiences and smarter business growth.

## The Problem

Restaurant managers must balance service quality, staff coordination, and customer acquisition, often using disconnected tools or manual processes.

- **Service coordination:** Waiter requests can be overlooked during busy periods, affecting customer experience.
- **Limited operational visibility:** Managers need convenient ways to oversee service workflows and coordinate staff.
- **Marketing challenges:** Creating consistent, engaging promotional content takes time and marketing expertise.
- **Unclear promotions:** Marketing messages may contain unsupported claims or wording that does not accurately reflect the restaurant's actual menu and offers.
- **Technology barriers:** Smaller restaurants need practical digital tools that are straightforward to adopt and operate.

TapWait AI addresses these challenges through a manager-focused dashboard supported by real-time communication, mobile notifications, and AI-assisted marketing.

## The Solution

### 1. Restaurant Management Dashboard

TapWait AI is designed around the needs of restaurant managers and owners. The dashboard serves as the central interface for restaurant operations and marketing workflows, helping managers access relevant functionality without treating each capability as a separate system.

Its purpose is to connect day-to-day service coordination with tools that support customer engagement and business growth.

### 2. Real-Time Waiter Service Coordination

TapWait supports waiter request management through backend APIs and Socket.IO real-time communication.

The system is designed to help coordinate customer requests with restaurant staff, reducing reliance on customers repeatedly trying to attract a waiter's attention.

The backend also supports restaurant-specific Socket.IO rooms, providing a foundation for organizing real-time communication by restaurant.

### 3. Android Waiter Notifications

TapWait supports registering waiter Android devices through Firebase Cloud Messaging (FCM).

This notification infrastructure enables the platform to target registered waiter devices with relevant alerts, helping staff respond to customer requests more efficiently.

### 4. MenuBoost AI: Smarter Restaurant Marketing

MenuBoost AI helps restaurant managers and owners generate promotional content from restaurant menu information and selected offers.

Using a hosted Gemini API, the feature supports AI-assisted marketing content creation, helping businesses turn their actual products and offers into campaign drafts for review.

The intended workflow is simple:

1. Select relevant menu information and an offer.
2. Generate promotional content with AI.
3. Review and refine the campaign.
4. Use the available publishing or delivery workflow when configured.

This approach helps restaurants create relevant marketing content without starting from scratch every time they run a promotion.

### 5. Campaign Guard: AI-Assisted Promotion Review

Campaign Guard explores how open-weight AI can help improve the quality of restaurant promotions.

The experimental integration uses Gemma 3 270M through Ollama to review promotional content against supplied menu and offer information.

It is intended to identify potential issues such as:

- Unsupported marketing claims.
- Inconsistencies between a promotion and its source information.
- Unclear or ambiguous wording.
- Missing information that customers may need to understand an offer.

Campaign Guard is designed as an assistant, not a replacement for business rules or human review. Exact prices, discount calculations, and eligibility conditions should be validated through deterministic application code against trusted records.

The current review endpoint accepts promotion and menu data directly. Connecting it to saved promotions and adding independent price validation are further development steps.

## Why TapWait AI?

**One dashboard. Connected operations. AI-assisted growth.**

TapWait AI combines restaurant management workflows with practical AI tools for customer engagement.

Its key differentiators are:

- **Manager-focused experience:** A dashboard-oriented approach to restaurant operations and marketing.
- **Connected service workflows:** Real-time communication and waiter device notification support.
- **Menu-driven marketing:** Promotional content generated from relevant restaurant information.
- **AI-assisted quality review:** An experimental open-weight model integration for reviewing promotional claims and clarity.
- **Practical AI architecture:** Hosted Gemini for campaign generation and lightweight Gemma for a focused review task.
- **Human oversight:** Managers retain responsibility for approving promotional content and verifying business information.

The goal is not simply to add AI to a restaurant application. It is to use AI where it can help managers save time, improve consistency, and make better use of their existing business information.

## Technology Stack

| Component                 | Technology                  |
| ------------------------- | --------------------------- |
| Backend runtime           | Node.js                     |
| API framework             | Express.js                  |
| Database                  | MongoDB                     |
| Real-time communication   | Socket.IO                   |
| Waiter push notifications | Firebase Cloud Messaging    |
| AI campaign generation    | Hosted Gemini API           |
| Experimental AI review    | Gemma 3 270M through Ollama |
| API documentation         | Swagger UI / OpenAPI        |
| Cross-origin support      | CORS                        |

The management dashboard and waiter application connect to the backend services. Their specific frontend frameworks and deployment details should be documented separately according to the actual implementations.

## System Architecture

```text
        Restaurant Managers and Owners
                      |
                      v
          TapWait Management Dashboard
                      |
          +-----------+-----------+
          |                       |
          v                       v
   Restaurant Operations     MenuBoost AI
          |                       |
          v                       v
      Express API            Gemini API
          |                       |
          v                       v
       MongoDB              Campaign Drafts
          |                       |
          v                       v
   Socket.IO / FCM          Campaign Guard
                                  |
                                  v
                         Gemma 3 270M / Ollama
                                  |
                                  v
                       AI Review and Suggestions
```

This diagram represents the intended system architecture. Actual workflows depend on the features configured and enabled in the current deployment.

## Getting Started

### Prerequisites

- Node.js and npm.
- Access to a MongoDB database.
- The environment variables required by the backend.
- A Gemini API key for campaign generation.
- Ollama with Gemma 3 270M for local Campaign Guard testing.
- Firebase configuration if push notifications are being used.

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Replace the placeholders with the actual repository URL and directory.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the backend root directory and configure the variables expected by the application.

Example for the database and local Gemma integration:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string

OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:270m
```

Configure the required Gemini, Firebase, and WhatsApp variables according to the features you intend to run.

**Security:** Never commit API keys, access tokens, database credentials, or private keys to your repository.

### 4. Start Gemma for Local Testing

Install Ollama and run:

```bash
ollama run gemma3:270m
```

Keep Ollama running while testing Campaign Guard locally.

### 5. Start the Backend

Use the start script defined in your project's `package.json`.

### 6. Open the API Documentation

Visit:

[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

Swagger provides interactive documentation for the API endpoints included in the current specification.

## API Overview

| Endpoint                         | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `GET /`                          | API welcome message                     |
| `GET /api-docs`                  | Interactive API documentation           |
| `/api/requests`                  | Waiter request operations               |
| `POST /api/devices/register`     | Register an Android waiter's FCM device |
| `/api/menu-boost`                | MenuBoost campaign operations           |
| `GET /api/whatsapp/status`       | Check WhatsApp Cloud API connectivity   |
| `GET /webhooks/whatsapp`         | Verify the WhatsApp webhook             |
| `POST /webhooks/whatsapp`        | Receive WhatsApp webhook events         |
| `GET /api/campaign-guard/status` | Check Ollama and model availability     |
| `POST /api/campaign-guard/check` | Review supplied promotion and menu data |

The API list describes the current backend routes and their intended roles. Refer to the Swagger documentation and implementation for exact methods and request schemas.

## Responsible AI and Customer Trust

TapWait AI is designed to use AI as a support tool for restaurant managers, with business owners remaining accountable for their decisions.

Our approach emphasizes:

- **Source-grounded content:** Promotions should reflect actual menus and offers.
- **Human review:** AI-generated content should be reviewed before publication.
- **Independent validation:** Prices, discounts, and eligibility rules should be checked against trusted data.
- **Privacy and security:** Credentials and customer information must be handled responsibly.
- **Messaging consent:** Marketing delivery must respect customer consent and applicable messaging rules.
- **Honest AI evaluation:** AI review results should not be presented as guarantees of accuracy.

## Hackathon Innovation

TapWait AI explores how AI can contribute to both restaurant operations and business growth through a manager-focused platform.

Rather than using one model for every task, the project separates campaign generation from focused promotional review. Gemini provides the generation capability, while the lightweight Gemma model offers an opportunity to explore open-weight AI for a defined quality-review workflow.

This architecture creates a foundation for future improvements in multilingual marketing, automated offer validation, campaign analytics, and restaurant-specific AI assistance.

The focus is practical: helping managers spend less time on repetitive work and more time improving service quality and customer relationships.

## Roadmap

- [ ] Express backend and API routing.
- [ ] MongoDB integration.
- [ ] Socket.IO connection and restaurant-room support.
- [ ] Waiter device registration API.
- [ ] MenuBoost API integration.
- [ ] WhatsApp Cloud API connectivity and webhook endpoints.
- [ ] Swagger API documentation setup.
- [ ] Complete end-to-end dashboard and waiter workflow testing.
- [ ] Connect Campaign Guard to saved promotions and trusted menu records.
- [ ] Implement independent price and discount validation.
- [ ] Evaluate Gemma against a representative set of restaurant promotions.
- [ ] Complete and evaluate campaign delivery workflows.
- [ ] Add campaign performance analytics and multilingual support.

Completed items indicate implemented components, not necessarily a fully tested end-to-end production workflow.

## Contributing

Contributions, feedback, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes and test them.
4. Submit a pull request describing the problem addressed and the proposed solution.

Please do not include secrets, production credentials, or private customer data in commits or issues.

## Project Status

TapWait AI is an evolving restaurant management and marketing platform. Some integrations and workflows may require additional configuration, testing, and implementation before production use.

The project documentation distinguishes existing backend capabilities from experimental AI integrations and planned improvements.


**TapWait AI: Better restaurant management. More responsive service. Smarter marketing.**
