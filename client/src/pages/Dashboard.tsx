import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Dashboard() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/canvas"); }, [navigate]);
  return null;
}
