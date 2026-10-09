"""Score a generated Grover program by how well it finds the marked state.

The Grover grammar emits a Qiskit program as text, for example:

    qc = QuantumCircuit(3, 3)
    qc.h(0)
    qc.cx(0, 2)

This parses those calls, simulates the three qubits, and returns
``1 - P(measuring |101>)``. Lower is better: 0 means the marked state is
certain to be measured.

It is a small simulator written for scoring, not a Qiskit replacement — but
gate phases that only differ by a global phase cannot affect a measurement
probability, which is all this returns.
"""

import cmath
import math
import re

QUBITS = 3
MARKED = "101"
PI = math.pi


def _pair(a, b, c, d):
    return [[a, b], [c, d]]


def _single(name, angles):
    """The 2x2 matrix for a one-qubit gate."""
    if name == "id":
        return _pair(1, 0, 0, 1)
    if name == "x":
        return _pair(0, 1, 1, 0)
    if name == "y":
        return _pair(0, -1j, 1j, 0)
    if name == "z":
        return _pair(1, 0, 0, -1)
    if name == "h":
        s = 1 / math.sqrt(2)
        return _pair(s, s, s, -s)
    if name == "s":
        return _pair(1, 0, 0, 1j)
    if name == "sdg":
        return _pair(1, 0, 0, -1j)
    if name == "t":
        return _pair(1, 0, 0, cmath.exp(1j * PI / 4))
    if name == "tdg":
        return _pair(1, 0, 0, cmath.exp(-1j * PI / 4))
    if name == "rx":
        c, s = math.cos(angles[0] / 2), math.sin(angles[0] / 2)
        return _pair(c, -1j * s, -1j * s, c)
    if name == "ry":
        c, s = math.cos(angles[0] / 2), math.sin(angles[0] / 2)
        return _pair(c, -s, s, c)
    if name == "rz":
        return _pair(cmath.exp(-1j * angles[0] / 2), 0, 0, cmath.exp(1j * angles[0] / 2))
    if name == "u":
        theta, phi, lam = angles
        c, s = math.cos(theta / 2), math.sin(theta / 2)
        return _pair(
            c,
            -cmath.exp(1j * lam) * s,
            cmath.exp(1j * phi) * s,
            cmath.exp(1j * (phi + lam)) * c,
        )
    return None


_PAULI_PRODUCTS = {
    # X⊗X, Y⊗Y, Z⊗Z and Z⊗X, used by the two-qubit rotation gates.
    "rxx": [[0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [1, 0, 0, 0]],
    "ryy": [[0, 0, 0, -1], [0, 0, 1, 0], [0, 1, 0, 0], [-1, 0, 0, 0]],
    "rzz": [[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]],
    "rzx": [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, -1], [0, 0, -1, 0]],
}


def _two(name, angles):
    """The 4x4 matrix for a two-qubit gate, ordered |first second>."""
    if name in ("cx", "cy", "cz", "swap"):
        blocks = {
            "cx": _pair(0, 1, 1, 0),
            "cy": _pair(0, -1j, 1j, 0),
            "cz": _pair(1, 0, 0, -1),
            "swap": _pair(0, 1, 1, 0),
        }
        inner = blocks[name]
        if name == "swap":
            return [
                [1, 0, 0, 0],
                [0, inner[0][0], inner[0][1], 0],
                [0, inner[1][0], inner[1][1], 0],
                [0, 0, 0, 1],
            ]
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, inner[0][0], inner[0][1]],
            [0, 0, inner[1][0], inner[1][1]],
        ]
    if name in _PAULI_PRODUCTS:
        product = _PAULI_PRODUCTS[name]
        cosine, sine = math.cos(angles[0] / 2), math.sin(angles[0] / 2)
        return [
            [
                (cosine if row == col else 0) - 1j * sine * product[row][col]
                for col in range(4)
            ]
            for row in range(4)
        ]
    return None


def _three(name):
    """The 8x8 matrix for ccx (Toffoli) or cswap (Fredkin)."""
    if name == "ccx":
        flip = (6, 7)  # |110> <-> |111>
    elif name == "cswap":
        flip = (5, 6)  # |101> <-> |110>
    else:
        return None
    matrix = [[1 if row == col else 0 for col in range(8)] for row in range(8)]
    for index in flip:
        matrix[index][index] = 0
    matrix[flip[0]][flip[1]] = 1
    matrix[flip[1]][flip[0]] = 1
    return matrix


def _apply(state, matrix, targets):
    """Apply a gate to selected qubits of a statevector (qubit 0 is the top bit)."""
    width = len(targets)
    size = 2**width
    out = [0j] * len(state)
    for index, amplitude in enumerate(state):
        if amplitude == 0:
            continue
        bits = [(index >> (QUBITS - 1 - qubit)) & 1 for qubit in range(QUBITS)]
        source = 0
        for qubit in targets:
            source = (source << 1) | bits[qubit]
        rest = index
        for qubit in targets:
            rest &= ~(1 << (QUBITS - 1 - qubit))
        for target in range(size):
            factor = matrix[target][source]
            if factor == 0:
                continue
            destination = rest
            for position, qubit in enumerate(targets):
                bit = (target >> (width - 1 - position)) & 1
                destination |= bit << (QUBITS - 1 - qubit)
            out[destination] += amplitude * factor
    return out


_ONE = {"id", "x", "y", "z", "h", "s", "sdg", "t", "tdg"}
_ONE_ROTATION = {"rx", "ry", "rz"}
_TWO = {"cx", "cy", "cz", "swap"}
_TWO_ROTATION = {"rxx", "ryy", "rzz", "rzx"}
_THREE = {"ccx", "cswap"}
_CALL = re.compile(r"qc\.(\w+)\s*\(([^)]*)\)")


def _number(text):
    """Angles arrive as `np.pi/4`, `0.5`, `3*np.pi/2` and friends."""
    return float(eval(text.replace("np.pi", repr(PI)), {"__builtins__": {}}, {}))


def _simulate(program):
    state = [0j] * (2**QUBITS)
    state[0] = 1 + 0j  # |000>
    for name, arguments in _CALL.findall(program):
        args = [piece.strip() for piece in arguments.split(",") if piece.strip()]
        if name == "measure":
            continue
        if name in _ONE:
            matrix, targets = _single(name, []), [int(args[0])]
        elif name in _ONE_ROTATION:
            matrix, targets = _single(name, [_number(args[0])]), [int(args[1])]
        elif name == "u":
            matrix, targets = _single(name, [_number(a) for a in args[:3]]), [int(args[3])]
        elif name in _TWO:
            matrix, targets = _two(name, []), [int(args[0]), int(args[1])]
        elif name in _TWO_ROTATION:
            matrix, targets = (
                _two(name, [_number(args[0])]),
                [int(args[1]), int(args[2])],
            )
        elif name in _THREE:
            matrix, targets = _three(name), [int(a) for a in args]
        else:
            continue  # a gate this scorer does not know: leave the state alone
        if matrix is None or len(set(targets)) != len(targets):
            continue
        state = _apply(state, matrix, targets)
    return state


def fitness(phenotype: str) -> float:
    """1 - P(measuring the marked state), so lower is better and 0 is perfect.

    A genome that runs out of codons leaves a half-written call behind: the
    literal parts of a production are already in the phenotype while its
    non-terminals never expanded, so `qc.u(, , , )` can appear. That circuit
    cannot find anything, so it scores 1.0 rather than raising — most of a GE
    population is incomplete, and raising on each of them would flood the run
    with errors instead of ranking them.
    """
    program = "\n".join(re.findall(r'"([^"]*)"', phenotype)).replace("\\n", "\n")
    try:
        state = _simulate(program)
    except Exception:  # noqa: BLE001 - anything unparseable is simply the worst score
        return 1.0
    return 1.0 - abs(state[int(MARKED, 2)]) ** 2
