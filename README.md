# News Reader

A modern, Flipboard-style news reader application built with React, TypeScript, and Express. Browse the latest news articles with an elegant card-based interface, featuring categories, search functionality, and favorites management.

![News Reader Demo](https://via.placeholder.com/800x400/333333/66ccff?text=News+Reader+Demo)

## 🚀 Features

- **Modern UI/UX**: Flipboard-inspired card-based interface with smooth transitions
- **News Categories**: Browse tech, general, science, sports, business, health, entertainment, politics, food, and travel news
- **Search Functionality**: Search for specific news topics and articles
- **Favorites System**: Save and manage your favorite articles locally
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Data**: Fetches latest news from TheNewsApi
- **Dark Theme**: Elegant dark mode interface with custom styling
- **Pagination**: Navigate through news articles with smooth paging
- **Offline Favorites**: Favorites are stored locally and persist between sessions

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **CSS3** - Custom responsive styling with CSS variables

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **node-fetch** - HTTP client for API calls
- **dotenv** - Environment variable management

### Data Source
- **TheNewsApi** - News data provider

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **TheNewsApi Token** - Sign up at [TheNewsApi](https://www.thenewsapi.com/) to get your free API token

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/JacintoDesign/news-reader.git
cd news-reader
```

### 2. Install Dependencies
```bash
npm run server:install
```
This command installs dependencies for both the server and web application.

### 3. Configure API Token
1. Copy the environment template:
   ```bash
   cp server/.env.example server/.env
   ```

2. Edit `server/.env` and add your TheNewsApi token:
   ```env
   THENEWSAPI_TOKEN=your_actual_token_here
   PORT=5177
   SEARCH_RECENCY_DAYS=30
   ```

### 4. Start the Application
```bash
npm run dev
```

This command starts both the Express proxy server (port 5177) and the Vite development server (port 5176).

### 5. Open in Browser
Navigate to [http://localhost:5176](http://localhost:5176) to view the application.

## 📁 Project Structure

```
news-reader/
├── package.json          # Root package.json with main scripts
├── server/               # Express proxy server
│   ├── server.js         # Main server file
│   ├── package.json      # Server dependencies
│   ├── .env.example      # Environment template
│   └── README.md         # Server-specific documentation
└── web/                  # React frontend application
    ├── src/
    │   ├── App.tsx       # Main application component
    │   ├── styles.css    # Global styles and theme
    │   ├── components/   # React components
    │   │   ├── HeadlinesList.tsx
    │   │   └── Pager.tsx
    │   └── lib/
    │       └── newsapi.ts # API client and types
    ├── public/           # Static assets
    ├── index.html        # HTML template
    ├── vite.config.ts    # Vite configuration
    └── package.json      # Frontend dependencies
```

## 🔧 Development

### Available Scripts

From the project root:

- `npm run server:install` - Install all dependencies
- `npm run dev` - Start both server and client in development mode
- `npm run server:dev` - Start only the Express server
- `npm run web:dev` - Start only the Vite development server

From the `web/` directory:

- `npm run build` - Build the frontend for production
- `npm run preview` - Preview the production build

### Environment Variables

The server accepts these environment variables in `server/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `THENEWSAPI_TOKEN` | Your TheNewsApi token (required) | - |
| `PORT` | Server port | 5177 |
| `SEARCH_RECENCY_DAYS` | Limit search results to last N days | 30 |

## 🎯 Usage

### Browsing News
- Select a category from the sidebar to browse news in that topic
- Use the dots at the bottom to navigate between articles on the current page
- Use the arrow buttons to navigate between pages

### Searching
- Enter search terms in the search box and press Enter
- Search results are limited to the last 30 days by default
- Clear the search box and press Enter to return to category browsing

### Managing Favorites
- Click the heart icon on any article to add it to favorites
- Access your favorites by clicking the "Favorites" toggle in the sidebar
- Favorites are stored locally in your browser

### Reading Articles
- Click "Read Full Article" to open the original article in a new tab
- Article metadata includes source and publication date when available

## 🔒 Security

- API tokens are never exposed to the browser
- The Express server acts as a proxy to hide sensitive credentials
- Environment variables are used for configuration
- CORS is handled appropriately for local development

## 🚀 Deployment

### Frontend Deployment
Build the frontend for production:
```bash
cd web
npm run build
```
The built files will be in `web/dist/` and can be deployed to any static hosting service.

### Backend Deployment
The Express server can be deployed to any Node.js hosting platform:
1. Ensure all dependencies are installed
2. Set the `THENEWSAPI_TOKEN` environment variable
3. Start with `node server/server.js`

## 📝 API Information

The application uses TheNewsApi for news data. The proxy server provides these endpoints:

- `GET /api/health` - Health check
- `GET /api/news/all` - Fetch news articles (proxied to TheNewsApi)

Query parameters for `/api/news/all`:
- `page` - Page number (default: 1)
- `categories` - News categories (e.g., "tech,science")
- `search` - Search terms (takes precedence over categories)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TheNewsApi](https://www.thenewsapi.com/) for providing the news data
- [Vite](https://vitejs.dev/) for the fast build tooling
- [React](https://reactjs.org/) for the component framework