# ---
# title: GurobiPy Basics: an LP, the Diet Model and Facility Location
# description: Three small models built in GurobiPy, a first LP and MIP, the classic diet model with a constraint added after the fact, and a facility location MIP, in Python.
# course: IE 3315 Operations Research I
# first: January 5, 2020 (in R)
# related: https://github.com/sear-labs/teaching-code/tree/main/notebooks/05_integer_and_branch_bound|the facility location notebook in the lab's teaching library
# ---

# %% [markdown]
# Three small models, built one piece at a time in GurobiPy: a first LP (and the same LP written as a
# matrix), a first MIP, the diet model, and a facility location model. Each one is a handful of lines:
# variables, an objective, constraints, `optimize()`, read the answer.
#
# To run it yourself: `pip install gurobipy numpy pandas`. The free licence that comes with
# `pip install gurobipy` is enough for everything here.

# %%
import numpy as np
import pandas as pd
import gurobipy as gp
from gurobipy import GRB

# %% [markdown]
# ## A first LP
#
# $$\begin{aligned} \max\ & x + 2y + 3z \\ \text{s.t.}\ & x + y \le 1 \\ & y + z \le 1 \\ & x,\ y,\ z \ge 0 \end{aligned}$$
#
# A model starts empty. `addVar` adds one variable at a time; its default lower bound is 0, so
# $x, y, z \ge 0$ comes for free. The objective and the constraints are then written the way they
# look on paper.

# %%
m = gp.Model("first_lp")
m.Params.OutputFlag = 0
x = m.addVar(name="x")
y = m.addVar(name="y")
z = m.addVar(name="z")
m.setObjective(x + 2 * y + 3 * z, GRB.MAXIMIZE)
m.addConstr(x + y <= 1, name="c1")
m.addConstr(y + z <= 1, name="c2")
m.update()
print(m.NumVars, "variables:", [v.VarName for v in m.getVars()])
print(m.NumConstrs, "constraints:", [c.ConstrName for c in m.getConstrs()])

# %% [markdown]
# **Predict:** $z$ is worth the most per unit. What are $x$, $y$, $z$ at the optimum, and what is the
# objective?

# %%
m.optimize()
print("objective =", m.ObjVal, "| x, y, z =", x.X, y.X, z.X)

# %% [markdown]
# ### The same LP as a matrix
#
# Under the expressions, Gurobi stores a constraint matrix $A$, one row per constraint and one column
# per variable. Here it is, read back from the model you just built.

# %%
print(m.getA().toarray())

# %% [markdown]
# You can also hand Gurobi that matrix directly. `addMVar` makes a vector of variables, and `@` is
# matrix multiplication, so $A v \le b$ is one line however many rows $A$ has. (A `scipy.sparse`
# matrix works in place of the NumPy array, which matters once most entries of $A$ are zero.)

# %%
A = np.array([[1, 1, 0],
              [0, 1, 1]])
b = np.array([1, 1])
c = np.array([1, 2, 3])
mm = gp.Model("first_lp_matrix")
mm.Params.OutputFlag = 0
v = mm.addMVar(3, name="v")
mm.setObjective(c @ v, GRB.MAXIMIZE)
mm.addConstr(A @ v <= b, name="rows")
mm.optimize()
print("objective =", mm.ObjVal, "| v =", v.X)

# %% [markdown]
# ## A first MIP
#
# $$\begin{aligned} \max\ & x + y + 2z \\ \text{s.t.}\ & x + 2y + 3z \le 4 \\ & x + y \ge 1 \\ & x,\ y,\ z \in \{0, 1\} \end{aligned}$$
#
# The only new thing is `vtype=GRB.BINARY`. **Predict:** there are only eight 0/1 combinations.
# Which one wins?

# %%
mip = gp.Model("first_mip")
mip.Params.OutputFlag = 0
x, y, z = [mip.addVar(vtype=GRB.BINARY, name=n) for n in "xyz"]
mip.setObjective(x + y + 2 * z, GRB.MAXIMIZE)
mip.addConstr(x + 2 * y + 3 * z <= 4)
mip.addConstr(x + y >= 1)
mip.optimize()
print("objective =", mip.ObjVal, "| x, y, z =", x.X, y.X, z.X)

# %% [markdown]
# ## The diet model
#
# Nine fast-food items, each with a price and four nutrients per serving. Find the cheapest number of
# servings of each that keeps every nutrient inside its daily limits.

# %%
foods = pd.DataFrame(
    [[2.49, 410, 24, 26, 730], [2.89, 420, 32, 10, 1190], [1.50, 560, 20, 32, 1800],
     [1.89, 380, 4, 19, 270], [2.09, 320, 12, 10, 930], [1.99, 320, 15, 12, 820],
     [2.49, 320, 31, 12, 1230], [0.89, 100, 8, 2.5, 125], [1.59, 330, 8, 10, 180]],
    index=["hamburger", "chicken", "hot dog", "fries", "macaroni", "pizza", "salad", "milk", "ice cream"],
    columns=["cost", "calories", "protein", "fat", "sodium"])
limits = pd.DataFrame({"min": [1800, 91, 0, 0], "max": [2200, GRB.INFINITY, 65, 1779]},
                      index=["calories", "protein", "fat", "sodium"])
foods

# %% [markdown]
# Two sets of variables. `buy[f]` is servings of food $f$. `nutrient[n]` is the day's total of
# nutrient $n$, and its bounds *are* the limits: a variable with a lower and an upper bound replaces
# a pair of $\ge$ and $\le$ constraints.

# %%
diet = gp.Model("diet")
diet.Params.OutputFlag = 0
buy = diet.addVars(foods.index, name="buy")
nutrient = diet.addVars(limits.index, lb=limits["min"].to_dict(), ub=limits["max"].to_dict(), name="nutrient")
diet.update()
print(len(buy), "buy variables,", len(nutrient), "nutrient variables")

# %% [markdown]
# One constraint per nutrient ties the total to the servings bought, and the objective is the bill.
# `addConstrs` writes one constraint for each item of a generator; `quicksum` is a fast `sum`.
#
# $$\text{nutrient}_n = \sum_f a_{fn}\, \text{buy}_f \qquad \min\ \sum_f \text{cost}_f\, \text{buy}_f$$

# %%
diet.addConstrs((nutrient[n] == gp.quicksum(foods.loc[f, n] * buy[f] for f in foods.index)
                 for n in limits.index), name="total")
diet.setObjective(gp.quicksum(foods.loc[f, "cost"] * buy[f] for f in foods.index), GRB.MINIMIZE)
diet.update()
print(diet.NumConstrs, "constraints")

# %% [markdown]
# **Predict:** which foods make the cheapest diet, and roughly what does it cost per day?

# %%
diet.optimize()
print(f"cost = ${diet.ObjVal:.2f}")
print("buy:", {f: round(buy[f].X, 2) for f in foods.index if buy[f].X > 1e-6})
print("nutrients:", {n: round(nutrient[n].X, 1) for n in limits.index})

# %% [markdown]
# ### Adding a constraint and re-solving
#
# No one wants that much dairy. Add a limit of at most 6 servings of milk and ice cream together to
# the model that already exists, and solve again. Nothing else is rebuilt. **Predict:** how much
# does the bill go up?

# %%
dairy = diet.addConstr(buy["milk"] + buy["ice cream"] <= 6, name="limit_dairy")
diet.optimize()
print("optimal?", diet.Status == GRB.OPTIMAL, "| infeasible?", diet.Status == GRB.INFEASIBLE)

# %% [markdown]
# ### Finding the conflict
#
# An infeasible model says only "no". `computeIIS` finds an *irreducible inconsistent subsystem*: a
# set of constraints and variable bounds that cannot all hold together, but that would hold if any one
# of them were dropped. Remember that the nutrient limits are bounds on the `nutrient` variables, and
# "servings can't be negative" is a lower bound of 0 on each `buy` variable. **Predict:** which of the
# four nutrient limits are in the conflict with the dairy limit, and which are not?

# %%
diet.computeIIS()
print("constraints: ", [c.ConstrName for c in diet.getConstrs() if c.IISConstr])
print("lower bounds:", [v.VarName for v in diet.getVars() if v.IISLB])
print("upper bounds:", [v.VarName for v in diet.getVars() if v.IISUB])

# %% [markdown]
# The IIS says *which* pieces conflict, not *how much* they would have to move. A feasibility
# relaxation answers that: on a copy of the model, `feasRelaxS` lets constraints be violated, adds a
# variable for each violation, and minimises their total. The arguments `(0, False, False, True)` mean:
# minimise the sum of violations, ignore the food bill while doing so, leave variable bounds fixed (so
# the nutrient limits and $\text{buy} \ge 0$ stay hard), and allow the four constraints to move. Each
# violation variable is named after the constraint it relaxes. **Predict:** which constraint moves,
# and by how much?

# %%
relaxed = diet.copy()
relaxed.Params.OutputFlag = 0
relaxed.feasRelaxS(0, False, False, True)
relaxed.optimize()
print("total violation:", round(relaxed.ObjVal, 4))
print({v.VarName: round(v.X, 4) for v in relaxed.getVars() if v.VarName.startswith("Art") and v.X > 1e-6})

# %% [markdown]
# ### Changing a constraint in place
#
# A constraint you added can also be changed in place. Raise the limit to 10 servings through its
# `RHS` attribute and solve once more.

# %%
dairy.RHS = 10
diet.optimize()
print("optimal?", diet.Status == GRB.OPTIMAL, f"| cost = ${diet.ObjVal:.2f}")
print("buy:", {f: round(buy[f].X, 2) for f in foods.index if buy[f].X > 1e-6})

# %% [markdown]
# ## Facility location
#
# Five plants could be opened, each with a fixed cost and a capacity. Four warehouses need fixed
# amounts. Shipping from plant $p$ to warehouse $w$ costs $c_{wp}$ per thousand units. Choose which
# plants to open and how much to ship.

# %%
plants = ["P1", "P2", "P3", "P4", "P5"]
warehouses = ["W1", "W2", "W3", "W4"]
capacity = pd.Series([20, 22, 17, 19, 18], index=plants)         # thousand units
fixed_cost = pd.Series([12000, 15000, 17000, 13000, 16000], index=plants)
demand = pd.Series([15, 18, 14, 20], index=warehouses)          # thousand units
ship_cost = pd.DataFrame([[4000, 2000, 3000, 2500, 4500],
                          [2500, 2600, 3400, 3000, 4000],
                          [1200, 1800, 2600, 4100, 3000],
                          [2200, 2600, 3100, 3700, 3200]], index=warehouses, columns=plants)
print("total capacity", capacity.sum(), "| total demand", demand.sum())

# %% [markdown]
# One binary per plant, $\text{open}_p$, and one continuous amount per route, $\text{ship}_{wp}$:
#
# $$\begin{aligned} \min\ & \textstyle\sum_p f_p\, \text{open}_p + \sum_{w,p} c_{wp}\, \text{ship}_{wp} \\ \text{s.t.}\ & \textstyle\sum_w \text{ship}_{wp} \le \text{cap}_p\, \text{open}_p \quad \text{each } p \\ & \textstyle\sum_p \text{ship}_{wp} = d_w \quad \text{each } w \end{aligned}$$
#
# The capacity row does two jobs: a closed plant ($\text{open}_p = 0$) can ship nothing.

# %%
fl = gp.Model("facility")
fl.Params.OutputFlag = 0
open_ = fl.addVars(plants, vtype=GRB.BINARY, name="open")
ship = fl.addVars(warehouses, plants, name="ship")
fl.setObjective(open_.prod(fixed_cost.to_dict())
                + gp.quicksum(ship_cost.loc[w, p] * ship[w, p] for w in warehouses for p in plants),
                GRB.MINIMIZE)
fl.addConstrs((ship.sum("*", p) <= capacity[p] * open_[p] for p in plants), name="capacity")
fl.addConstrs((ship.sum(w, "*") == demand[w] for w in warehouses), name="demand")
fl.update()
print(fl.NumVars, "variables (", fl.NumBinVars, "binary ) |", fl.NumConstrs, "constraints")

# %% [markdown]
# You can give Gurobi a starting guess (a MIP start) through each variable's `Start` attribute. The R
# version of this page opened every plant except the one with the highest fixed cost. A start can
# make the search shorter; it cannot change the optimum.

# %%
for p in plants:
    open_[p].Start = 1
open_[fixed_cost.idxmax()].Start = 0
print("start: close", fixed_cost.idxmax(), "and open the rest")

# %% [markdown]
# **Predict:** total demand is 67 and total capacity is 96. How many plants will be open, and which?

# %%
fl.optimize()
print(f"total cost = ${fl.ObjVal:,.0f}")
print("open:", [p for p in plants if open_[p].X > 0.5])
pd.DataFrame([[ship[w, p].X for p in plants] for w in warehouses], index=warehouses, columns=plants)

# %% [markdown]
# Questions to try:
#
# - Run the feasibility relaxation again with the third argument `True`, so variable bounds may move
#   too. Which bound moves, and would you accept that answer as a diet?
# - In the facility model, change `vtype=GRB.BINARY` to continuous (bounds 0 to 1) and re-solve. What
#   does a value like 0.6 for $\text{open}_p$ mean, and is that cost higher or lower than the MIP's?
# - Read the shipment table: does every open plant ship to capacity? What would the cheapest
#   unopened plant have to cost before it opens?
