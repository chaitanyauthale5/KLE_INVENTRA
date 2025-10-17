import Layout from "./Layout.jsx";

import PatientDashboard from "./PatientDashboard";

import Dashboard from "./dashboard.jsx";
import SuperAdminDashboard from "./SuperAdminDashboard.jsx";

import Patients from "./Patients";

import Settings from "./Settings";

import Staff from "./Staff";

import TherapyScheduling from "./TherapyScheduling";
import OfficeAppointments from "./OfficeAppointments";



import Notifications from "./Notifications";

import Reports from "./Reports";
import ReportsLive from "./ReportsLive.jsx";

import Analytics from "./Analytics";
import PrescriptionRecords from "./PrescriptionRecords.jsx";

import DoctorDashboard from "./DoctorDashboard";

import OfficeExecutiveDashboard from "./OfficeExecutiveDashboard";

import Hospitals from "./Hospitals";
import SuperClinics from "./SuperClinics";
import SuperFinances from "./SuperFinances";

import PatientProgress from "./PatientProgress";
import PatientAppointments from "./PatientAppointments";
import DoctorAppointments from "./DoctorAppointments";
import PatientAnalytics from "./PatientAnalytics";
import PatientPlan from "./PatientPlan";
import PatientSchedule from "./PatientSchedule";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import SignIn from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";
import RoleGuard from "../components/auth/RoleGuard.jsx";
// Page registry for dynamic highlighting and layout title
const PAGES = {
    PatientDashboard: PatientDashboard,
    Dashboard: Dashboard,
    SuperAdminDashboard: SuperAdminDashboard,
    Patients: Patients,
    Settings: Settings,
    Staff: Staff,
    TherapyScheduling: TherapyScheduling,
    OfficeAppointments: OfficeAppointments,
    Notifications: Notifications,
    Reports: Reports,
    Analytics: Analytics,
    PrescriptionRecords: PrescriptionRecords,
    DoctorDashboard: DoctorDashboard,
    OfficeExecutiveDashboard: OfficeExecutiveDashboard,
    dashboard: Dashboard,
    Hospitals: Hospitals,
    SuperClinics: SuperClinics,
    SuperFinances: SuperFinances,
    PatientProgress: PatientProgress,
    PatientAnalytics: PatientAnalytics,
    PatientPlan: PatientPlan,
    PatientSchedule: PatientSchedule,
    Appointments: PatientAppointments,
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                <Route path="/" element={<RoleGuard roles={[]}> <PatientDashboard /> </RoleGuard>} />

                <Route path="/PatientDashboard" element={<RoleGuard roles={["patient","super_admin"]}> <PatientDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/patientdashboard" element={<RoleGuard roles={["patient","super_admin"]}> <PatientDashboard /> </RoleGuard>} />

                <Route path="/Dashboard" element={<RoleGuard roles={["super_admin","clinic_admin"]}> <Dashboard /> </RoleGuard>} />
                <Route path="/SuperAdminDashboard" element={<RoleGuard roles={["super_admin"]}> <SuperAdminDashboard /> </RoleGuard>} />

                <Route path="/Patients" element={<RoleGuard roles={["super_admin","clinic_admin","doctor","office_executive"]}> <Patients /> </RoleGuard>} />
                {/* lowercase alias for easier navigation */}
                <Route path="/patients" element={<RoleGuard roles={["super_admin","clinic_admin","doctor","office_executive"]}> <Patients /> </RoleGuard>} />

                <Route path="/Staff" element={<RoleGuard roles={["super_admin","clinic_admin"]}> <Staff /> </RoleGuard>} />
                <Route path="/TherapyScheduling" element={<RoleGuard roles={["super_admin","clinic_admin","doctor","patient","office_executive"]}> <TherapyScheduling /> </RoleGuard>} />
                <Route path="/OfficeAppointments" element={<RoleGuard roles={["office_executive","clinic_admin"]}> <OfficeAppointments /> </RoleGuard>} />
                
                <Route path="/Notifications" element={<RoleGuard roles={[]}> <Notifications /> </RoleGuard>} />
                {/* Prescription & Records */}
                <Route path="/PrescriptionRecords" element={<RoleGuard roles={["doctor","patient","office_executive"]}> <PrescriptionRecords /> </RoleGuard>} />
                <Route path="/Reports" element={<RoleGuard roles={["super_admin","clinic_admin","doctor"]}> <ReportsLive /> </RoleGuard>} />
                <Route path="/Analytics" element={<RoleGuard roles={["super_admin","clinic_admin","doctor"]}> <Analytics /> </RoleGuard>} />
                <Route path="/DoctorDashboard" element={<RoleGuard roles={["doctor","super_admin"]}> <DoctorDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/doctordashboard" element={<RoleGuard roles={["doctor","super_admin"]}> <DoctorDashboard /> </RoleGuard>} />
                
                <Route path="/OfficeExecutiveDashboard" element={<RoleGuard roles={["office_executive","super_admin"]}> <OfficeExecutiveDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/office_executivedashboard" element={<RoleGuard roles={["office_executive","super_admin"]}> <OfficeExecutiveDashboard /> </RoleGuard>} />
                <Route path="/superadmindashboard" element={<RoleGuard roles={["super_admin"]}> <SuperAdminDashboard /> </RoleGuard>} />

                <Route path="/Hospitals" element={<RoleGuard roles={["super_admin","clinic_admin"]}> <Hospitals /> </RoleGuard>} />
                <Route path="/SuperClinics" element={<RoleGuard roles={["super_admin"]}> <SuperClinics /> </RoleGuard>} />
                <Route path="/SuperFinances" element={<RoleGuard roles={["super_admin"]}> <SuperFinances /> </RoleGuard>} />

                {/* Patient appointments */}
                <Route path="/Appointments" element={<RoleGuard roles={["patient","super_admin"]}> <PatientAppointments /> </RoleGuard>} />
                {/* Patient Progress */}
                <Route path="/PatientProgress" element={<RoleGuard roles={["patient","super_admin"]}> <PatientProgress /> </RoleGuard>} />
                {/* Patient Analytics & Report */}
                <Route path="/PatientAnalytics" element={<RoleGuard roles={["patient","super_admin"]}> <PatientAnalytics /> </RoleGuard>} />
                {/* Patient Daily Plan */}
                <Route path="/PatientPlan" element={<RoleGuard roles={["patient","super_admin"]}> <PatientPlan /> </RoleGuard>} />
                {/* Patient Schedule */}
                <Route path="/PatientSchedule" element={<RoleGuard roles={["patient","super_admin"]}> <PatientSchedule /> </RoleGuard>} />
                {/* Doctor/Therapist appointments management */}
                <Route path="/DoctorAppointments" element={<RoleGuard roles={["doctor","super_admin"]}> <DoctorAppointments /> </RoleGuard>} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <Routes>
                {/* Public auth routes without Layout */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                {/* All other app routes under Layout */}
                <Route path="/*" element={<PagesContent />} />
            </Routes>
        </Router>
    );
}