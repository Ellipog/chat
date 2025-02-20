# Chat

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.13.0-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)

A modern chat application built with Next.js, featuring real-time communication, user authentication, and AI-powered interactions.

## ✨ Features

- 🔐 Secure user authentication with JWT and bcrypt
- 💬 Real-time chat functionality
- 🤖 AI integration with OpenAI
- 🎨 Modern UI with Tailwind CSS and Framer Motion
- 📱 Fully responsive design
- 🔍 Syntax highlighting for code snippets
- 🌐 MongoDB database integration

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Styling**: TailwindCSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcryptjs
- **AI Integration**: OpenAI API
- **Package Manager**: npm/bun

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/Ellipog/chat.git
   cd chat
   ```

2. **Install dependencies**

   ```bash
   bun i
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with the following variables:

   ```env
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=openai_model_name (e.g. gpt-4o-mini)
   ```

4. **Run the development server**

   ```bash
   bun dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📁 Project Structure

```
├── app/                # Next.js app directory
│   ├── api/           # API routes
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # Reusable React components
├── context/          # React context providers
├── lib/             # Utility functions and configurations
├── models/          # MongoDB models
├── public/          # Static assets
└── types/           # TypeScript type definitions
```

---

<div align="center">
by Elliot
</div>
