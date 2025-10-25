# 💪 Fitness Chatbot

An AI-powered fitness knowledge base chatbot built with React Router, featuring authentication and scientific paper analysis using PaperQA.

## Features

- 🚀 **AI-Powered Responses**: GPT-4 powered fitness advice with scientific citations
- 🔐 **Complete Authentication**: Login, registration, and user management
- 📚 **Scientific Sources**: All responses include citations from research papers
- 🎯 **Personalized Experience**: User profiles and fitness preferences
- 🛡️ **Protected Routes**: Secure authentication flow with JWT tokens
- 📱 **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- ⚡️ **Hot Module Replacement**: Fast development with React Router
- 🔄 **Type Safety**: Full TypeScript implementation

## Tech Stack

- **Frontend**: React 19, React Router 7, TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Authentication**: JWT tokens with localStorage management
- **API**: RESTful API client with comprehensive error handling
- **Build**: Vite with SSR support

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API server running on `http://localhost:8000` (or configure `VITE_API_BASE_URL`)

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

### Authentication Flow

1. **Home Page** (`/`): Landing page for new users
2. **Login/Register** (`/login`): Authentication forms
3. **Chat** (`/chat`): Protected fitness chatbot interface
4. **Profile** (`/profile`): User settings and preferences

The app automatically handles authentication state and redirects users appropriately.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
