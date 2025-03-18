import React, { useState } from "react";
import axios from "axios";

const UploadGrammar = () => {
  const [grammarText, setGrammarText] = useState("");

  const handleUpload = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/upload-grammar", {
        grammar_text: grammarText,
      });
      alert("Grammar uploaded successfully!");
    } catch (error) {
      console.error("Error uploading grammar:", error);
    }
  };

  return (
    <div>
      <h3>Upload BNF Grammar</h3>
      <textarea value={grammarText} onChange={(e) => setGrammarText(e.target.value)} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default UploadGrammar;