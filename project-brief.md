Project Brief – Chatbot Frontend
Goal:
Build a simple chatbot web app frontend using shadcn/ui for styling and components. The backend API is already available at http://localhost:8000.

Requirements:

Framework & Styling

Use React.

Use shadcn/ui for UI components (input, button, chat bubbles, layout).

Responsive layout (desktop & mobile friendly).

Features

Chat interface:

Display messages from both user and bot in a scrolling conversation view.

Different styling for user messages vs bot messages.

Input box:

User can type a message and press Enter or click a send button to send.

API integration:

POST user message to http://localhost:8000/query (adjust path if needed).

Display bot reply in the chat after receiving the response.

Show a loading indicator (e.g., typing dots) while waiting for the bot reply.

Data Flow

Messages stored in a state array with { role: "user" | "bot", text: string }.

On send: push user message → call API → push bot message.

Assumptions

No authentication required for now.

UI Reference (basic idea)

Header: "Chatbot" title.

Main chat area: scrollable list of messages.

Footer: text input + send button.
