import re
from typing import Dict, List

class BNFParser:
    def __init__(self, grammar_text: str):
        """
        Initialize the BNF parser with the given grammar text.
        """
        self.grammar_text = grammar_text
        self.grammar = self.parse_grammar()
    
    def parse_grammar(self) -> Dict[str, List[List[str]]]:
        """
        Parses BNF grammar from a given string into a structured dictionary.
        """
        grammar = {}
        lines = self.grammar_text.strip().split("\n")
        
        for line in lines:
            # Match BNF rules of the form <non-terminal> ::= expansion | expansion
            match = re.match(r"(<[^<>]+>)\s*::=\s*(.+)", line)
            if match:
                non_terminal = match.group(1).strip()
                expansions = match.group(2).split("|")
                
                # Convert each expansion into a list of tokens
                grammar[non_terminal] = [exp.strip().split() for exp in expansions]
        
        return grammar
    
    def get_grammar(self) -> Dict[str, List[List[str]]]:
        """
        Returns the parsed grammar.
        """
        return self.grammar
    
    def display_grammar(self):
        """
        Prints the grammar in a structured format.
        """
        for key, value in self.grammar.items():
            print(f"{key} ::= {[' | '.join(' '.join(rule) for rule in value)]}")

# Example Usage
# grammar_text = """
# <expr> ::= <term> | <expr> + <term> | <expr> - <term>
# <term> ::= <factor> | <term> * <factor> | <term> / <factor>
# <factor> ::= ( <expr> ) | <var>
# <var> ::= x | y | 1 | 2 | 3
# """

# parser = BNFParser(grammar_text)
# parser.display_grammar()
# print(parser.get_grammar())

