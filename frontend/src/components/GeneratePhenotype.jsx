import React, { useState } from "react";
import axios from "axios";

const GeneratePhenotype = () => {
  const [genome, setGenome] = useState("");
  const [phenotype, setPhenotype] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    
    try {
      const genomeArray = genome.split(",").map(num => parseInt(num.trim(), 10)); // Convert input to array
      const response = await axios.post("http://127.0.0.1:8000/generate-phenotype", {
        genome: genomeArray,
      });

      setPhenotype(response.data.phenotype);
    } catch (err) {
      setError("Failed to generate phenotype. Please check your input.");
      console.error("Error generating phenotype:", err);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", textAlign: "center" }}>
      <h3>Generate Phenotype</h3>
      
      <input
        type="text"
        value={genome}
        onChange={(e) => setGenome(e.target.value)}
        placeholder="Enter genome (e.g. 4, 2, 1, 3, 5)"
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />
      
      <button onClick={handleGenerate} style={{ padding: "10px", width: "100%", cursor: "pointer" }}>
        {loading ? "Generating..." : "Generate Phenotype"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      
      {phenotype && (
        <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <h4>Phenotype:</h4>
          <p style={{ fontSize: "18px", fontWeight: "bold" }}>{phenotype}</p>
        </div>
      )}
    </div>
  );
};

export default GeneratePhenotype;