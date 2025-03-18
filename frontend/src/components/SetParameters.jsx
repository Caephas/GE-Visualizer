import React, { useState } from "react";
import axios from "axios";

const defaultParams = {
  population_size: 500,
  max_generations: 50,
  p_crossover: 0.9,
  p_mutation: 0.05,
  elite_size: 2,
  hall_of_fame_size: 2,
  codon_size: 300,
  max_tree_depth: 40,
  tournament_size: 5,
  min_init_depth: 5,
  max_init_depth: 15,
  codon_consumption: "eager",
  genome_representation: "binary",
};

const SetParameters = () => {
  const [params, setParams] = useState(defaultParams);

  const handleUpdate = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/set-parameters", params);
      alert("GE Parameters updated!");
    } catch (error) {
      console.error("Error setting parameters:", error);
    }
  };

  return (
    <div>
      <h3>Set GE Parameters</h3>
      <button onClick={handleUpdate}>Update Parameters</button>
    </div>
  );
};

export default SetParameters;