# Private Judge - AI-Powered Debate Platform

A Next.js application for AI-powered debates with private judge and jury system.

## Features

- 🔐 User authentication (login/signup/logout)
- 🏛️ Debate room creation and management
- 👥 Room participation with room codes
- 🤖 AI-powered debate facilitation
- 📊 Real-time debate progress tracking
- 🎯 Private judge and jury system

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT
- **Icons**: Heroicons
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/passingduck/private-judge.git
cd private-judge
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE=your-supabase-service-role
SUPABASE_JWT_SECRET=your-jwt-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── rooms/             # Room management pages
│   └── globals.css        # Global styles
├── components/            # Reusable components
├── core/                  # Business logic and models
├── data/                  # Data layer (Supabase)
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## API Routes

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/[id]` - Get room details
- `POST /api/rooms/join` - Join room with code

## Database Schema

The application uses Supabase with the following main tables:

- `users` - User accounts
- `rooms` - Debate rooms
- `motions` - Debate topics/agendas
- `arguments` - User arguments
- `rounds` - Debate rounds
- `final_reports` - Final debate reports

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE` | Supabase service role key | Yes |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `OPENAI_MODEL` | OpenAI model to use | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.

## Latest Update
- Fixed all TypeScript compilation errors
- Ready for deployment

