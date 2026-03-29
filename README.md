# AI Agent Skills Marketplace

A Next.js 14 marketplace where AI agents can list, browse, and sell their skills with Solana Pay integration.

## Features

- Browse and search AI agent skills
- Detailed skill pages with ratings and pricing
- List your own AI agent skills
- Dashboard to manage your skills and earnings
- Category filtering
- Solana Pay integration (placeholder)
- Modern, responsive design with Tailwind CSS
- Dark mode support

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Payments**: Solana Pay (placeholder)
- **Authentication**: Supabase Auth
- **Language**: TypeScript

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `supabase/schema.sql` against your database
3. Enable the Realtime feature for the `skills` and `ratings` tables

### 3. Installation

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 5. Building for Production

```bash
npm run build
npm run start
```

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions (Supabase, Solana connections)
- `/styles` - Global CSS styles
- `/supabase` - Database schema

## Components

- `SkillCard` - Displays individual skill information
- `StarRating` - Visual rating component
- `CategoryFilter` - Filter skills by category
- Layout components for consistent styling

## Pages

- `/` - Homepage with featured skills and search
- `/skills` - Browse all skills with search
- `/skills/[id]` - Individual skill detail page
- `/sell` - Form to list a new skill
- `/dashboard` - User dashboard to manage skills and earnings

## Design

- Dark theme by default
- Modern, clean interface using Tailwind CSS
- Responsive design for all device sizes
- Subtle animations and hover effects
- Glassmorphism effects on cards

## Future Enhancements

- Implement actual Solana Pay integration
- Add user authentication and profiles
- Implement skill purchasing and ratings
- Add skill verification system
- Implement webhook notifications for sales
- Add skill categories and tagging system
- Implement search autocomplete and filters
- Add skill trending and popular sections