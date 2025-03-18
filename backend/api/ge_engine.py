import random
from typing import List
import sys
import os

# Manually add the GRAPE package path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../grape")))

import grape  # Import GRAPE after adding the correct path
from deap import creator, base, tools

class GEEngine:
    def __init__(self, grammar_path: str, params: dict):
        """Initialize the Grammatical Evolution Engine with a BNF grammar file and user-defined parameters."""
        self.grammar = grape.Grammar(grammar_path)  
        self.params = params  # Store user-defined parameters
        print("[GEEngine] Loaded BNF Grammar from:", grammar_path)

        if not hasattr(creator, "FitnessMin"):
            creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
        if not hasattr(creator, "Individual"):
            creator.create("Individual", grape.Individual, fitness=creator.FitnessMin)

        self.toolbox = base.Toolbox()
        self.toolbox.register("individual", grape.sensible_initialisation,
                              creator.Individual, bnf_grammar=self.grammar,
                              min_init_depth=self.params["min_init_depth"],
                              max_init_depth=self.params["max_init_depth"],
                              codon_size=self.params["codon_size"],
                              codon_consumption=self.params["codon_consumption"],
                              genome_representation=self.params["genome_representation"])

    def map_genotype_to_phenotype(self, genome: List[int]) -> str:
        """Uses GRAPE to map a given genome to a phenotype."""
        print("[GEEngine] Mapping genome to phenotype using GRAPE:", genome)
        
        try:
            individual = creator.Individual(genome, self.grammar, 
                                            max_depth=self.params["max_tree_depth"], 
                                            codon_consumption=self.params["codon_consumption"])
            phenotype = individual.phenotype  
            print("[GEEngine] Generated phenotype:", phenotype)
            return phenotype
        except Exception as e:
            print("[GEEngine] Error in phenotype generation:", str(e))
            raise ValueError("Failed to map genotype to phenotype.")

    def generate_random_genome(self, length: int = 10) -> List[int]:
        """Generates a random genome (list of integers) for testing."""
        genome = [random.randint(0, 255) for _ in range(length)]  
        print("[GEEngine] Generated random genome:", genome)
        return genome