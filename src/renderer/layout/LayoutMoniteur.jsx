// layout/LayoutMoniteur.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import SidebarMoniteur from "../components/SidebarMoniteur";

export default function LayoutMoniteur() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <SidebarMoniteur />
      <div style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}