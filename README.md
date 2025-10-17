# AyurSutra

AyurSutra is a comprehensive healthcare management system designed specifically for Ayurvedic treatments and practices. It provides a full-stack solution for managing patients, hospitals, therapy sessions, appointments, and more, with integrated AI assistance for doctors and guardians.

## Features

- **Patient Management**: Add, view, and manage patient records with detailed profiles.
- **Hospital Management**: Register and manage multiple hospitals with role-based access.
- **Appointment Scheduling**: Schedule and manage therapy sessions and appointments.
- **AI Doctor Bot**: Integrated AI assistant for doctors to assist in diagnosis and treatment planning.
- **Guardian Support**: Assign guardians to patients and manage their interactions.
- **Reports and Analytics**: Generate reports and view analytics on therapy progress and patient outcomes.
- **Notifications**: Real-time notifications for appointments, updates, and alerts.
- **User Authentication**: Secure authentication with role-based access control (Doctor, Patient, Guardian, Therapist, Support, Hospital Admin).
- **Bulk Upload**: Upload patient data in bulk for efficient data entry.
- **Export Reports**: Export detailed reports in various formats.

## Tech Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **JWT**: Authentication
- **bcrypt**: Password hashing

### Frontend
- **React**: UI library
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components
- **Axios**: HTTP client

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (create a `.env` file):
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ayursutra
   JWT_SECRET=your_jwt_secret
   ```
4. Start the server:
   ```
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## Usage

1. Register a hospital or sign in with existing credentials.
2. Select your role (Doctor, Patient, Guardian, etc.).
3. Navigate through the dashboard to manage patients, schedule appointments, view reports, etc.
4. Use the AI Doctor Bot for assistance in treatment planning.

## Project Structure

```
AyurSutra-main/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── config/
│   ├── package.json
│   └── README.md
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   └── utils/
    ├── public/
    ├── package.json
    └── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
