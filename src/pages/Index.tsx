import { Navigate } from "react-router-dom";
import { useAppState } from "@/state/AppState";

const Index = () => {
  const { state } = useAppState();
  return <Navigate to={state.authed ? "/dashboard" : "/login"} replace />;
};

export default Index;
