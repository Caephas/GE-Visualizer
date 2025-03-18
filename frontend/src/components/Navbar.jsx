import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav style={{ background: "#222", padding: "10px", color: "#fff", textAlign: "center" }}>
      <h2>GE Visualizer</h2>
      <div style={{ marginTop: "10px" }}>
        <Link to="/" style={{ color: "#fff", margin: "10px" }}>Upload Grammar</Link>
        <Link to="/parameters" style={{ color: "#fff", margin: "10px" }}>Set Parameters</Link>
        <Link to="/generate" style={{ color: "#fff", margin: "10px" }}>Generate Phenotype</Link>
        <Link to="/visualization" style={{ color: "#fff", margin: "10px" }}>View Tree</Link>
      </div>
    </nav>
  );
};

export default Navbar;