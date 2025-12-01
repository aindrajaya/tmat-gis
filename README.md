# TMAT Monitoring Dashboard

A real-time peatland groundwater level monitoring dashboard built with React, TypeScript, and Vite. Provides comprehensive monitoring, visualization, and device management for TMAT (Tinggi Muka Air Tanah) stations across Indonesia.

## 🌍 Language Support

This application supports **English** and **Bahasa Indonesia** with seamless language switching. Select your preferred language using the language switcher button in the header.

## ✨ Features

- **Real-time Monitoring**: Live dashboard showing TMAT conditions across all monitoring stations
- **Interactive Maps**: Geo-tagged device locations with OpenStreetMap integration
- **Data Visualization**: 
  - Station distribution maps
  - Daily TMAT condition trends (stacked bar charts)
  - TMAT trend analysis (line charts)
- **Device Management**: Add, register, and manage monitoring devices with geo-tagging helper
- **Raw Data Access**: Browse telemetry data in real-time with filtering and export capabilities
- **Advanced Filtering**: Filter by Province, Regency, Company Type, and Date Range
- **Multi-language UI**: Full English and Indonesian language support
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 🛠 Tech Stack

### Frontend
- **React** 19.2.0 - UI library
- **TypeScript** 5.8.2 - Type safety
- **Vite** 6.2.0 - Build tool
- **React Router** 7.9.6 - Client-side routing
- **Tailwind CSS** - Styling
- **i18next** 23.7.6 - Internationalization (i18n)
- **react-i18next** 14.0.0 - React i18n integration

### Visualization & Mapping
- **Recharts** 3.5.1 - Data visualization charts
- **React Leaflet** 5.0.0 - Interactive maps
- **Leaflet** 1.9.4 - Mapping library
- **Lucide React** 0.555.0 - Icon library

### Backend
- **Express** 5.1.0 - Server framework
- **CORS** 2.8.5 - Cross-origin resource sharing

## 📁 Project Structure

```
tmat-monitoring-dashboard/
├── components/                 # Reusable React components
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── Header.tsx             # Header with filters and language switcher
│   ├── DashboardMap.tsx       # Map visualization component
│   └── LanguageSwitcher.tsx   # Language switcher button
├── pages/                     # Page components
│   ├── Dashboard.tsx          # Main monitoring dashboard
│   ├── DeviceForm.tsx         # Device management and registration
│   └── RawData.tsx            # Raw telemetry data table
├── context/                   # React Context for state management
│   └── FilterContext.tsx      # Filter state management
├── services/                  # Data and API services
│   └── mockData.ts            # Mock data for development
├── i18n/                      # Internationalization setup
│   └── i18n.ts               # i18next configuration
├── locales/                   # Translation files
│   ├── en/                    # English translations
│   │   ├── common.json        # Common/shared translations
│   │   ├── dashboard.json     # Dashboard page translations
│   │   ├── forms.json         # Form and device management translations
│   │   └── tables.json        # Table translations
│   └── id/                    # Indonesian (Bahasa) translations
│       ├── common.json
│       ├── dashboard.json
│       ├── forms.json
│       └── tables.json
├── types.ts                   # TypeScript type definitions
├── App.tsx                    # Root app component with routing
├── index.tsx                  # Application entry point
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Modern web browser with ES2020+ support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tmat-monitoring-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 🌐 Internationalization (i18n)

The dashboard supports English and Bahasa Indonesia with automatic language detection and persistence.

### Language Detection
- **Browser Language**: Auto-detects user's browser language preference
- **localStorage**: Persists user's language selection
- **Fallback**: Defaults to English if unsupported language detected

### Adding New Translations

1. **Add keys to translation files**:
   - English: `locales/en/[namespace].json`
   - Indonesian: `locales/id/[namespace].json`

2. **Use in components**:
   ```tsx
   import { useTranslation } from 'react-i18next';
   
   const MyComponent = () => {
     const { t } = useTranslation();
     
     return <h1>{t('common:app.name')}</h1>;
   };
   ```

3. **Namespace organization**:
   - `common.json` - App-wide strings (nav, buttons, user info)
   - `dashboard.json` - Dashboard page content
   - `forms.json` - Device form and registration content
   - `tables.json` - Data table headers and labels

### Current Translation Keys Structure

```json
{
  "app": { "name": "TMAT Monitor" },
  "nav": { "dashboard": "Dashboard", ... },
  "buttons": { "save": "Save Device", ... },
  "dashboard": { 
    "metrics": { "totalStations": "Total Stations", ... },
    "charts": { "dailyTmatCondition": "Daily TMAT Condition (%)", ... }
  }
}
```

## 📊 Pages Overview

### Dashboard (`/`)
Main monitoring overview with:
- Metrics cards (Total Stations, Active, Critical Low TMAT, Avg Temperature)
- Station distribution map
- Daily TMAT condition percentage (stacked bar chart)
- TMAT trend analysis (line chart)
- Filter controls for Province, Regency, Type, and Date

### Device Logger (`/master/device`)
Device management interface with:
- Device registration form with unique ID
- Geo-tagging helper with interactive map
- Administrative location selection (Province/Regency)
- Registered devices table with status
- Coordinate input with real-time map updates

### Raw Data (`/raw-data`)
Telemetry data viewer with:
- Real-time data table with timestamps
- Device ID, location, TMAT, temperature, and pH columns
- CSV export functionality
- Responsive table layout

## 🎨 UI Components

### Sidebar
- Navigation menu with sections: Main, Management, Admin
- Active route highlighting
- User profile info with role and permissions
- Smooth transitions and hover effects

### Header
- Page title and subtitle
- Multi-filter dropdown controls
- Date range picker
- Language switcher button
- Sticky positioning with backdrop blur

### LanguageSwitcher
- Globe icon with current language code
- One-click toggle between EN/ID
- Saves preference to localStorage
- Integrated into header

### Metric Cards
- Four-column grid on desktop, responsive on mobile
- Color-coded indicators (emerald, rose, amber)
- Real-time data updates based on filters

## 🗺 Mapping Features

- **React Leaflet Integration**: Interactive maps with OpenStreetMap tiles
- **Station Markers**: Device locations with popups showing details
- **Geo-tagging Helper**: Coordinate input with automatic map centering
- **Boundary Layers**: Simulated administrative boundary visualization
- **Responsive Maps**: Full-width, touch-friendly map controls

## 📈 Data Visualization

### Charts
- **Stacked Bar Chart**: Daily TMAT conditions by category (Safe, Warning, Danger)
- **Line Chart**: TMAT trend analysis over time
- **Recharts**: Responsive, animated charting library
- **Real-time Updates**: Charts update based on filter selections

## 🔄 State Management

### FilterContext
Manages application-wide filter state:
- **Province** (provinsi): Selected province
- **Regency** (kabupaten): Selected regency/city
- **Company Type** (jenis_perusahaan): Selected business type
- **Date Range** (startDate, endDate): Date filtering

```tsx
const { filters, updateFilter, resetFilters } = useFilters();
```

## 📱 Responsive Design

- Mobile-first approach with Tailwind CSS
- Grid layouts that adapt from 1 to 4 columns
- Touch-friendly interactive elements
- Readable typography scaling
- Optimized for screens from 320px to 4K

## 🔧 Configuration

### Vite Configuration (`vite.config.ts`)
- React plugin with JSX transform
- Path alias: `@/*` for root imports

### TypeScript Configuration (`tsconfig.json`)
- ES2020 target
- React 19 JSX transform
- Module resolution with path aliases

### Environment Variables

Create `.env.local` file (not committed to repo):
```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=TMAT Monitor
```

## 🧪 Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking (TypeScript)
npx tsc --noEmit
```

### Mock Data

The application uses mock data from `services/mockData.ts` for development:
- **MOCK_DEVICES**: 10 sample monitoring stations
- **MOCK_REALTIME**: 50+ telemetry data points
- **MOCK_PERUSAHAAN**: 5 company records

Replace with real API calls in production.

## 🌐 Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Deployment

### Build
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel deploy
```

### Deploy to Netlify
```bash
netlify deploy --prod --dir dist
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 📝 Notes for Development

### Adding New Pages
1. Create component in `pages/` folder
2. Add route in `App.tsx`
3. Add navigation item in `Sidebar.tsx`
4. Create translation files in `locales/en/` and `locales/id/`
5. Use `useTranslation()` hook for all UI text

### Connecting to Real API
1. Replace mock data in `services/mockData.ts` with API calls
2. Use `fetch` or `axios` for HTTP requests
3. Update `FilterContext.tsx` to fetch filtered data
4. Consider adding loading states and error handling

### Styling Best Practices
- Use Tailwind CSS utility classes
- Follow existing color scheme (emerald for primary, slate for neutral)
- Maintain responsive design patterns
- Reference the Tailwind config in `tailwind.config.js` if needed

## 🤝 Contributing

1. Create a feature branch
2. Make changes with translations for both languages
3. Test language switching
4. Ensure responsive design
5. Submit pull request

## 📄 License

This project is licensed under the [LICENSE](LICENSE) file.

## 👥 Team

- **Developer**: [Your Name]
- **Project**: TMAT Monitoring Dashboard
- **Organization**: Pak Hamka

## 📞 Support

For issues, questions, or suggestions:
- Create an issue on the repository
- Contact: [support-email]

## 🔄 Version History

### v1.0.0 (December 2025)
- ✅ Initial release with multi-language support
- ✅ Dashboard with real-time monitoring
- ✅ Device management interface
- ✅ Raw data telemetry viewer
- ✅ English & Bahasa Indonesia translations
- ✅ Interactive mapping with Leaflet
- ✅ Advanced filtering system
- ✅ Responsive design

---

**Last Updated**: December 1, 2025  
**Status**: Production Ready