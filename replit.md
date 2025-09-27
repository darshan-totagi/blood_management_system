# Overview

PulseConnect is a blood donation network application that connects blood donors with people in need. The platform allows users to register as donors, find nearby donors based on location and blood type, and manage blood requests. The application features location-based donor search, WhatsApp integration for communication, and a credit system for donors.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and follows a component-based architecture:
- **Routing**: Uses wouter for client-side navigation
- **State Management**: React Query (@tanstack/react-query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds
- **Maps Integration**: React Leaflet for interactive maps showing donor locations

## Backend Architecture
The server uses Express.js with TypeScript:
- **API Structure**: RESTful endpoints organized in a routes module
- **Database Layer**: Drizzle ORM with separation between database operations and business logic
- **Storage Pattern**: Interface-based storage abstraction (IStorage) for data operations
- **Middleware**: Custom request logging, JSON parsing, and error handling

## Authentication System
Uses Replit's OpenID Connect (OIDC) authentication:
- **Strategy**: Passport.js with OpenID Connect strategy
- **Session Management**: Express sessions with PostgreSQL session store
- **User Management**: Automatic user creation/update on successful authentication

## Database Design
PostgreSQL database with Drizzle ORM:
- **Schema Location**: Shared between client and server in `/shared/schema.ts`
- **Tables**: users, donors, bloodRequests, donations, creditTransactions, sessions
- **Migrations**: Drizzle Kit for database schema management
- **Relationships**: Proper foreign key relationships between users, donors, and related entities

## Data Storage Strategy
Implements a storage interface pattern:
- **Abstraction**: IStorage interface defines all database operations
- **Implementation**: Concrete storage class handles Drizzle ORM interactions
- **Operations**: CRUD operations for users, donors, blood requests, donations, and credits
- **Location Features**: Geographic queries for finding nearby donors using lat/lng coordinates

## External Dependencies

- **Database**: Neon PostgreSQL (serverless PostgreSQL)
- **Authentication**: Replit OIDC for user authentication
- **Maps**: Leaflet for interactive maps and location services
- **Communication**: WhatsApp integration for donor-requester communication
- **Fonts**: Google Fonts (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling