# Angular .NET 8 Real-time Notifications

A real-time notification system built with Angular (frontend) using ng-event-bus for notification management and .NET 8 (backend) with SignalR for real-time communication.

## Project Structure

```
angular-dotnet-realtime-notifications/
├── backend/                        # .NET 8 Backend
│   └── NotificationAPI/            # Web API Project
│       ├── Controllers/            # API Controllers
│       ├── Hubs/                   # SignalR Hubs
│       ├── Models/                 # Data Models
│       ├── Services/               # Business Logic Services
│       ├── Properties/             # Project Properties
│       ├── Program.cs              # Application Entry Point
│       ├── appsettings.json        # Configuration
│       └── NotificationAPI.csproj  # Project File
│
└── frontend/                       # Angular Frontend
    ├── src/
    │   ├── app/
    │   │   ├── components/         # UI Components
    │   │   │   ├── notification/             # Notification Panel Component
    │   │   │   └── notification-badge/       # Notification Badge Component
    │   │   ├── models/             # Data Models
    │   │   ├── services/           # Services
    │   │   │   ├── notification.service.ts   # Notification Service
    │   │   │   └── signalr.service.ts        # SignalR Communication Service
    │   │   ├── app.component.*     # Root Component
    │   │   ├── app.module.ts       # Main Module
    │   │   └── app-routing.module.ts  # Routing Configuration
    │   ├── environments/           # Environment Configuration
    │   ├── assets/                 # Static Assets
    │   ├── index.html              # Main HTML
    │   ├── styles.scss             # Global Styles
    │   └── main.ts                 # Application Entry Point
    ├── package.json                # NPM Dependencies
    └── angular.json                # Angular Configuration
```

## Features

- Real-time notifications from server to client
- Notification management using ng-event-bus
- Different notification types (info, success, warning, error)
- Clean architecture with proper separation of concerns
- Performant implementation adhering to best practices

## Technology Stack

- **Backend**:
  - .NET 8
  - ASP.NET Core Web API
  - SignalR for real-time communication
  - Dependency Injection
  - Clean Architecture principles

- **Frontend**:
  - Angular 17
  - ng-event-bus for event management
  - RxJS for reactive programming
  - SCSS for styling
  - SignalR client for real-time communication

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v18+)
- [Angular CLI](https://cli.angular.io/)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend/NotificationAPI
   ```

2. Restore dependencies:
   ```bash
   dotnet restore
   ```

3. Build the project:
   ```bash
   dotnet build
   ```

4. Run the application:
   ```bash
   dotnet run
   ```

The backend API will start on http://localhost:5000 by default.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   ng serve
   ```

The Angular application will be available at http://localhost:4200.

## Using the Application

1. Open http://localhost:4200 in your browser
2. Click on the notification bell icon in the header
3. Use the notification panel to:
   - Send test notifications
   - Create custom notifications of different types
   - Mark notifications as read
   - Delete notifications

## How It Works

### Backend

- **SignalR Hub**: The `NotificationHub` class handles real-time client connections
- **Notification Service**: Manages notification data and broadcasts updates to clients
- **REST API**: Provides endpoints for creating, reading, updating, and deleting notifications

### Frontend

- **SignalR Service**: Connects to the backend hub and receives real-time notifications
- **Notification Service**: Manages local notification state and sends requests to the API
- **ng-event-bus**: Handles internal event communication between services and components
- **Notification Components**: Provides the UI for displaying and interacting with notifications

## Design Patterns Used

- **Observer Pattern**: Using RxJS Observables for state management
- **Dependency Injection**: For loose coupling between services
- **Repository Pattern**: For data access operations
- **Singleton Pattern**: Services are registered as singletons
- **Factory Pattern**: For creating notification objects
- **Mediator Pattern**: ng-event-bus acts as a mediator between components

## Performance Considerations

- **Connection State Management**: Smart reconnection with exponential backoff
- **Efficient DOM Updates**: Only updating changed notifications rather than the entire list
- **Optimistic UI Updates**: Updating the UI before the server confirms operations
- **TypeScript Interfaces**: Strong typing for better reliability
- **Clean Unsubscription**: Proper cleanup to avoid memory leaks

## License

This project is licensed under the MIT License - see the LICENSE file for details.
