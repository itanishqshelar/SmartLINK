import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./context/ToastContext";
import Landing from "./pages/Landing";
import Vault from "./pages/Vault";
import Dashboard from "./pages/Dashboard";
import Transitions from "./pages/Transitions";
import Share from "./pages/Share";
import AskAI from "./pages/AskAI";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="vault" element={<Vault />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="transitions" element={<Transitions />} />
                <Route path="ask" element={<AskAI />} />
                <Route path="share" element={<Share />} />
                <Route path="*" element={<Navigate to="/vault" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </ToastProvider>
  );
}
