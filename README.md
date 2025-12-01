# 🍽️ Cantina IPB

A modern web application for the IPB (Instituto Politécnico de Bragança) university canteen. Users can browse dishes, vote on their favorites, request new dishes, and view daily menus.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38B2AC?logo=tailwind-css)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)

## ✨ Features

- **🍕 Dish Catalog** - Browse all available dishes with images and descriptions
- **⬆️ Voting System** - Upvote or downvote dishes to influence the menu
- **📝 Dish Requests** - Submit requests for new dishes you'd like to see
- **📅 Daily Menu** - View today's menu and upcoming meals
- **🏆 Top Dishes** - See the most popular dishes based on community votes
- **🔍 Search & Filter** - Find dishes by name or filter by tags
- **🌍 Multilingual** - Full support for Portuguese and English
- **🌙 Dark Mode** - Toggle between light and dark themes
- **📱 Responsive** - Works seamlessly on desktop and mobile devices
- **👨‍💼 Admin Panel** - Manage dishes, menus, and approve user submissions

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore, Storage, Auth)
- **Icons**: [Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Internationalization**: [next-intl](https://next-intl-docs.vercel.app/)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)
- A [Firebase](https://firebase.google.com/) project (for backend services)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/cantina.git
cd cantina
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key"

# Cloudflare Turnstile (optional, for bot protection)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── [locale]/          # Localized routes (en, pt)
│   │   ├── admin/         # Admin dashboard pages
│   │   ├── about/         # About page
│   │   ├── rules/         # Rules page
│   │   └── top-dishes/    # Top dishes page
│   └── api/               # API routes
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── dish/             # Dish-related components
│   ├── layout/           # Layout components (Header, etc.)
│   ├── menu/             # Menu components
│   ├── pagination/       # Pagination component
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and Firebase helpers
├── types/                # TypeScript type definitions
└── middleware.ts         # Next.js middleware (i18n routing)
```

## 📜 Available Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start development server             |
| `npm run build`         | Build for production                 |
| `npm run start`         | Start production server              |
| `npm run lint`          | Run ESLint                           |
| `npm run type-check`    | Run TypeScript type checking         |
| `npm run upload-dishes` | Upload dishes from JSON to Firestore |

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Report Bugs** - Found a bug? Open an issue!
- 💡 **Suggest Features** - Have an idea? We'd love to hear it!
- 📝 **Improve Documentation** - Help us make the docs better
- 🔧 **Submit Code** - Fix bugs or implement new features
- 🌍 **Translations** - Help translate the app to more languages

### Getting Started with Contributing

1. **Fork the repository**

   Click the "Fork" button at the top right of this page.

2. **Clone your fork**

   ```bash
   git clone https://github.com/your-username/cantina.git
   cd cantina
   ```

3. **Create a new branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Make your changes**

   Write your code following our [code style guidelines](#code-style-guidelines).

5. **Run checks before committing**

   ```bash
   npm run type-check
   npm run lint
   ```

6. **Commit your changes**

   Write clear, concise commit messages:

   ```bash
   git commit -m "feat: add new dish filtering by allergens"
   # or
   git commit -m "fix: resolve voting button not updating count"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

7. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open a Pull Request**

   Go to the original repository and click "New Pull Request". Select your fork and branch, then fill out the PR template.

### Pull Request Guidelines

- **Keep PRs focused** - One feature or fix per PR
- **Write descriptive titles** - Clearly explain what the PR does
- **Include context** - Explain why the change is needed
- **Add screenshots** - For UI changes, include before/after screenshots
- **Update documentation** - If your change affects how things work
- **Test your changes** - Make sure everything works as expected

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define types in `src/types/index.ts`
- Use interfaces for object types
- Be explicit with function return types

### Components

- Use `"use client"` directive for client components
- Prefer functional components with hooks
- Use shadcn/ui components for UI elements
- Follow the existing component patterns

### Naming Conventions

| Type       | Convention                  | Example               |
| ---------- | --------------------------- | --------------------- |
| Components | PascalCase                  | `DishCard.tsx`        |
| Utilities  | camelCase                   | `firestore.ts`        |
| Hooks      | camelCase with `use` prefix | `useDebounce.ts`      |
| Types      | PascalCase                  | `Dish`, `DishRequest` |

### Internationalization

- All user-facing text must use the translation system
- Add new translations to both `messages/en.json` and `messages/pt.json`
- Do not translate dish names or categories

### Styling

- Use Tailwind CSS classes
- Follow shadcn/ui design patterns
- Support both dark and light modes
- Use responsive design (mobile-first)

## 🐛 Reporting Issues

Found a bug or have a suggestion? Please [open an issue](https://github.com/your-username/cantina/issues/new) with:

- **Clear title** describing the issue
- **Steps to reproduce** (for bugs)
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment info** (browser, OS, etc.)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [IPB - Instituto Politécnico de Bragança](https://ipb.pt/) - For the inspiration
- [shadcn/ui](https://ui.shadcn.com/) - For the beautiful UI components
- [Vercel](https://vercel.com/) - For the amazing Next.js framework
- All our [contributors](https://github.com/your-username/cantina/graphs/contributors) ❤️

---

<p align="center">
  Made with ❤️ for the IPB community
</p>
