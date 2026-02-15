# SyncScript - Collaborative Research Platform

A hand-drawn collaborative research platform for knowledge vaults with real-time sync capabilities.

## Features

- 🎨 Hand-drawn aesthetic design
- 🌓 Dark/Light theme toggle
- 📂 Knowledge Vaults management
- ⭐ Favorites system
- 👥 Real-time collaboration
- 🔐 Role-based access control
- 📱 Fully responsive design
- ⚙️ Functional settings with photo upload

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Icons**: Lucide React
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/Supl3x/SyncScript.git

# Navigate to project directory
cd SyncScript

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with your Supabase credentials:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Set up the database (see Database Setup below)

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Database Setup

Before running the app, you need to set up the Supabase database:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your credentials** from Settings → API
3. **Create a `.env` file** with:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. **Run the database schema** - See [Database Setup Guide](./documents/DATABASE_SETUP.md) for detailed instructions

The database schema consists of 6 SQL files that must be executed in order:
- `database/schema.sql` - Core tables
- `database/functions.sql` - Helper functions
- `database/triggers.sql` - Automatic triggers
- `database/rls_policies.sql` - Security policies
- `database/caching.sql` - Caching utilities
- `database/edge_cases.sql` - Integrity constraints

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

### Deploy to GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Deploy:
```bash
npm run deploy
```

## Project Structure

```
SyncScript/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   │   ├── useSupabase.ts        # Core database hooks
│   │   └── useSupabaseExtended.ts # Extended features hooks
│   ├── contexts/       # React contexts (Auth)
│   ├── lib/            # Utility functions
│   │   ├── supabase.ts          # Supabase client
│   │   └── database.types.ts    # TypeScript types
│   └── App.tsx         # Main app component
├── database/           # Database schema files
│   ├── schema.sql       # Core tables
│   ├── functions.sql    # Database functions
│   ├── triggers.sql     # Automatic triggers
│   ├── rls_policies.sql # Security policies
│   ├── caching.sql      # Caching utilities
│   └── edge_cases.sql   # Integrity constraints
├── documents/           # Documentation
│   ├── DATABASE_SETUP.md              # Database setup guide
│   ├── DATABASE_INTEGRATION_CHECKLIST.md # Integration checklist
│   └── INTEGRATION_SUMMARY.md         # Integration summary
├── public/             # Static assets
└── dist/              # Build output (generated)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Features Overview

### Knowledge Vaults
- Create, edit, and delete knowledge vaults (projects)
- Organize research with tags and colors
- Track progress and status
- Soft-delete for data recovery

### Collaboration
- Real-time comments/chat in vaults
- File attachments and uploads
- Organization-based sharing
- Role-based access control (owner, admin, user, guest)

### User Management
- Secure authentication via Supabase
- User profiles with extended data
- Activity logging and audit trails
- Session management

### Notifications
- In-app notifications
- Real-time updates
- Mark as read functionality

### Dark Theme
Toggle between light and dark modes using the button in the bottom-right corner of the dashboard.

### Favorites
Mark vaults as favorites using the three-dot menu on each vault card. Access all favorites from the sidebar.

### Settings
- Upload profile photo
- Update display name and title
- Configure preferences
- Save changes to database

### Loading Screen
Animated loading screen with progress bar that shows percentage completion.

## Database Documentation

For detailed information about the database:
- **[Database Setup Guide](./documents/DATABASE_SETUP.md)** - Step-by-step setup instructions
- **[Integration Checklist](./documents/DATABASE_INTEGRATION_CHECKLIST.md)** - Track integration progress
- **[Integration Summary](./documents/INTEGRATION_SUMMARY.md)** - Overview of what's been integrated

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Project Link: [https://github.com/Supl3x/SyncScript2.0](https://github.com/Supl3x/SyncScript2.0)
