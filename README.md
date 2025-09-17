# Rate Limiter Dashboard

A comprehensive rate limiting testing tool with automatic detection, flood testing, and real-time monitoring capabilities.

## 🚀 Features

- **🔍 Auto Rate Limit Detection** - Automatically detects rate limits from API response headers
- **🌊 Flood Testing** - Test APIs until rate limit is hit to discover actual limits
- **⚙️ Custom Rate Limiting** - Set custom rate limits for any API endpoint
- **📊 Real-time Monitoring** - Live cooldown timers and request tracking
- **📥 Data Export** - Export all data to JSON format
- **🌙 Dark Mode** - Toggle between light and dark themes
- **📋 Request History** - Track all requests with detailed information
- **🔔 Notifications** - Real-time success/error notifications

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)

## 🛠️ Installation & Setup

### 1. Clone or Download the Project

```bash
# If using git
git clone https://github.com/ayushhhthakur/rate-limiter.git
cd rate-limiter

# Or download and extract the ZIP file
```

### 2. Backend Setup

```bash
# Install backend dependencies
npm install

# Start the backend server
npm run dev
```

The backend server will start on `http://localhost:3001`

**Backend Dependencies:**
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `nodemon` - Development auto-restart (dev dependency)

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the frontend development server
npm run dev
```

The frontend will start on `http://localhost:3000`

**Frontend Dependencies:**
- `react` - Frontend framework
- `react-dom` - React DOM utilities
- `vite` - Build tool and dev server
- `tailwindcss` - CSS framework
- `autoprefixer` - CSS post-processor
- `postcss` - CSS transformation tool

## 🎯 Usage

### 1. API Testing Tab

**Auto Rate Limit Detection:**
- Enter any API URL (e.g., `https://api.github.com/user`)
- Select HTTP method (GET, POST, PUT, etc.)
- Click "Single Test" to make one request and detect rate limits
- Click "Flood Test" to send multiple requests until rate limit is hit

**Supported Rate Limit Headers:**
- `X-RateLimit-*` (GitHub, GitLab)
- `RateLimit-*` (Standard RFC)
- `X-Rate-Limit-*` (Twitter)
- `CF-RateLimit-*` (Cloudflare)
- `Retry-After` (Standard)

### 2. Custom API Testing Tab

**Manual Rate Limit Configuration:**
- Enter API endpoint URL
- Set custom max requests and time window
- Test with your own rate limiting rules
- Monitor real-time usage and cooldowns

### 3. Dashboard Features

**Stats Overview:**
- URLs Tracked
- Custom Endpoints
- Total Requests
- Currently Blocked

**Real-time Monitoring:**
- Live cooldown timers
- Request count vs limits
- Status indicators (Active/Blocked)
- Last request timestamps

**Data Management:**
- 📊 View request history
- 📥 Export data to JSON
- 🗑️ Clear all data
- 🌙 Toggle dark mode

## 🔧 API Endpoints

### Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/home` | Test endpoint with IP rate limiting |
| POST | `/test-url` | Test URL with auto rate limit detection |
| POST | `/test-custom` | Test URL with custom rate limits |
| GET | `/monitor` | Monitor IP-based rate limiting |
| GET | `/monitor-urls` | Monitor URL-based rate limiting |
| GET | `/monitor-custom` | Monitor custom endpoint rate limiting |
| POST | `/clear-data` | Clear all rate limiting data |

### Example API Calls

**Test URL with Auto Detection:**
```bash
curl -X POST http://localhost:3001/test-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/user", "method": "GET"}'
```

**Test URL with Custom Limits:**
```bash
curl -X POST http://localhost:3001/test-custom \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/user", "method": "GET", "limit": 5, "window": 60}'
```

## 📊 Testing Popular APIs

### GitHub API
- **URL:** `https://api.github.com/user`
- **Rate Limit:** 60 requests/hour (unauthenticated)
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### JSONPlaceholder
- **URL:** `https://jsonplaceholder.typicode.com/posts/1`
- **Rate Limit:** No explicit limits
- **Good for:** Basic testing

### HTTPBin
- **URL:** `https://httpbin.org/get`
- **Rate Limit:** Varies by deployment
- **Good for:** Testing different HTTP methods

## 🐛 Troubleshooting

### Common Issues

**1. "Unexpected token" error in Custom API Testing:**
- Ensure backend server is running on port 3001
- Check if `/test-custom` endpoint exists
- Verify backend has been updated with custom endpoints

**2. CORS errors:**
- Backend includes CORS middleware
- Ensure frontend is running on port 3000
- Check browser console for specific CORS issues

**3. Rate limit not detected:**
- API may not include rate limit headers
- Check browser network tab for response headers
- Use flood testing to discover limits empirically

### Development Mode

**Backend Hot Reload:**
```bash
npm run dev  # Uses nodemon for auto-restart
```

**Frontend Hot Reload:**
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

## 📁 Project Structure

```
rate-limiter/
├── package.json              # Backend dependencies
├── server.js                 # Express server
├── rateLimiter.js            # Rate limiting logic
├── README.md                 # This file
└── frontend/
    ├── package.json          # Frontend dependencies
    ├── index.html            # HTML template
    ├── vite.config.js        # Vite configuration
    ├── tailwind.config.js    # Tailwind CSS config
    ├── postcss.config.js     # PostCSS config
    └── src/
        ├── main.jsx          # React entry point
        ├── App.jsx           # Main React component
        └── index.css         # Global styles
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vite Documentation](https://vitejs.dev/)

---

**Happy Rate Limiting! 🚀**