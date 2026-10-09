"""Trimmed, pure-Python subset of DEAP that GRAPE's evolution loop needs.

Vendored from DEAP 1.4.4 (LGPL-3.0) so the GE Visualizer playground can run
inside Pyodide without pulling numpy/scipy/moocore. Only the pieces the GRAPE
evolution operators actually use are included, with the code kept as close to
upstream as possible:

  * ``Toolbox`` and ``Fitness``            -- deap/base.py
  * ``MetaCreator`` / ``create``           -- deap/creator.py
  * ``selRandom`` / ``selTournament``      -- deap/tools/selection.py

See frontend/src/engine/THIRD_PARTY_NOTICES.md for the full notice.
"""

from __future__ import annotations

import random
import sys
from collections.abc import Sequence
from copy import deepcopy
from functools import partial
from operator import attrgetter, mul, truediv


class Toolbox(object):
    """A toolbox for evolution that contains the evolutionary operators."""

    def __init__(self):
        self.register("clone", deepcopy)
        self.register("map", map)

    def register(self, alias, function, *args, **kargs):
        pfunc = partial(function, *args, **kargs)
        pfunc.__name__ = alias
        pfunc.__doc__ = function.__doc__

        if hasattr(function, "__dict__") and not isinstance(function, type):
            pfunc.__dict__.update(function.__dict__.copy())

        setattr(self, alias, pfunc)

    def unregister(self, alias):
        delattr(self, alias)

    def decorate(self, alias, *decorators):
        pfunc = getattr(self, alias)
        function, args, kargs = pfunc.func, pfunc.args, pfunc.keywords
        for decorator in decorators:
            function = decorator(function)
        self.register(alias, function, *args, **kargs)


class Fitness(object):
    """Measure of quality of a solution (deap.base.Fitness, verbatim)."""

    weights = None
    wvalues = ()

    def __init__(self, values=()):
        if self.weights is None:
            raise TypeError(
                "Can't instantiate abstract %r with abstract attribute weights."
                % (self.__class__)
            )

        if not isinstance(self.weights, Sequence):
            raise TypeError(
                "Attribute weights of %r must be a sequence." % self.__class__
            )

        if len(values) > 0:
            self.values = values

    def getValues(self):
        return tuple(map(truediv, self.wvalues, self.weights))

    def setValues(self, values):
        assert len(values) == len(self.weights), (
            "Assigned values have not the same length than fitness weights"
        )
        try:
            self.wvalues = tuple(map(mul, values, self.weights))
        except TypeError:
            _, _, traceback = sys.exc_info()
            raise TypeError(
                "Both weights and assigned values must be a "
                "sequence of numbers when assigning to values of "
                "%r. Currently assigning value(s) %r of %r to a "
                "fitness with weights %s."
                % (self.__class__, values, type(values), self.weights)
            ).with_traceback(traceback)

    def delValues(self):
        self.wvalues = ()

    values = property(
        getValues,
        setValues,
        delValues,
        (
            "Fitness values. Use directly ``individual.fitness.values = values`` "
            "in order to set the fitness and ``del individual.fitness.values`` "
            "in order to clear (invalidate) the fitness. The (unweighted) fitness "
            "can be directly accessed via ``individual.fitness.values``."
        ),
    )

    def dominates(self, other, obj=slice(None)):
        not_equal = False
        for self_wvalue, other_wvalue in zip(
            self.wvalues[obj], other.wvalues[obj]
        ):
            if self_wvalue > other_wvalue:
                not_equal = True
            elif self_wvalue < other_wvalue:
                return False
        return not_equal

    @property
    def valid(self):
        return len(self.wvalues) != 0

    def __hash__(self):
        return hash(self.wvalues)

    def __gt__(self, other):
        return not self.__le__(other)

    def __ge__(self, other):
        return not self.__lt__(other)

    def __le__(self, other):
        return self.wvalues <= other.wvalues

    def __lt__(self, other):
        return self.wvalues < other.wvalues

    def __eq__(self, other):
        return self.wvalues == other.wvalues

    def __ne__(self, other):
        return not self.__eq__(other)

    def __deepcopy__(self, memo):
        copy_ = self.__class__()
        copy_.wvalues = self.wvalues
        return copy_

    def __str__(self):
        return str(self.values if self.valid else tuple())

    def __repr__(self):
        return "%s.%s(%r)" % (
            self.__module__,
            self.__class__.__name__,
            self.values if self.valid else tuple(),
        )


class MetaCreator(type):
    """Metaclass that turns class-valued attributes into per-instance ones."""

    def __new__(cls, name, base, dct):
        return super(MetaCreator, cls).__new__(cls, name, (base,), dct)

    def __init__(cls, name, base, dct):
        dict_inst = {}
        dict_cls = {}
        for obj_name, obj in dct.items():
            if isinstance(obj, type):
                dict_inst[obj_name] = obj
            else:
                dict_cls[obj_name] = obj

        def init_type(self, *args, **kargs):
            for obj_name, obj in dict_inst.items():
                setattr(self, obj_name, obj())
            if base.__init__ is not object.__init__:
                base.__init__(self, *args, **kargs)

        cls.__init__ = init_type
        super(MetaCreator, cls).__init__(name, (base,), dict_cls)


class _Namespace:
    """Small stand-in for a module, so ``creator.Individual`` keeps working."""


base = _Namespace()
base.Fitness = Fitness
base.Toolbox = Toolbox

creator = _Namespace()
tools = _Namespace()


def create(name, base_class, **kargs):
    """Create (and register on ``creator``) a new class, like deap.creator."""
    cls = MetaCreator(name, base_class, kargs)
    setattr(creator, name, cls)
    return cls


creator.create = create


def selRandom(individuals, k):
    return [random.choice(individuals) for i in range(k)]


def selTournament(individuals, k, tournsize, fit_attr="fitness", trace=None):
    """Tournament selection.

    [GEV] Instrumented: pass a list as `trace` to record the population indices
    that competed and the winner of each tournament. Selecting by index keeps
    the same random draws `random.choice` would make, so a seeded run is
    unchanged whether or not tracing is on.
    """
    chosen = []
    for _ in range(k):
        indices = [random.randrange(len(individuals)) for _ in range(tournsize)]
        best = max(indices, key=lambda index: getattr(individuals[index], fit_attr))
        chosen.append(individuals[best])
        if trace is not None:
            trace.append({"aspirants": indices, "winner": best})
    return chosen


tools.selRandom = selRandom
tools.selTournament = selTournament
