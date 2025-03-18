import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UploadGrammar from "./components/UploadGrammar";
import SetParameters from "./components/SetParameters";
import GeneratePhenotype from "./components/GeneratePhenotype";
import TreeVisualization from "./components/TreeVisualization";
import Navbar from "./components/Navbar";

const AppRouter = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<UploadGrammar />} />
        <Route path="/parameters" element={<SetParameters />} />
        <Route path="/generate" element={<GeneratePhenotype />} />
        <Route path="/visualization" element={<TreeVisualization />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;