# ---
# title: Benders Decomposition Algorithm Explained
# description: Benders decomposition built by hand in Python on a small mixed-integer program, with the master problem, the dual subproblem, optimality and feasibility cuts, and bounds that meet, checked against Gurobi.
# course: IE 5301 Advanced Operations Research
# first: January 9, 2020 (in R)
# related: https://github.com/sear-labs/advopt-lithiumsc/blob/main/notebooks/02b_benders.ipynb|Benders cuts on a stochastic supply-chain model, in the lab's lithium notebooks
# ---

# %% [markdown]
# Benders decomposition splits a problem in two. A **master problem** chooses the hard variables (here,
# an integer $y$); a **subproblem** chooses the easy ones (continuous $x$) once $y$ is fixed. The
# subproblem's dual sends a constraint, a *cut*, back to the master, and the two trade cuts and
# proposals until their bounds meet.
#
# $$\begin{aligned} \min\ 2x_1 + 3x_2 + 2y \quad \text{s.t.}\quad x_1 + 2x_2 + y &\ge 3 \\ 2x_1 - x_2 + 3y &\ge 4 \\ x_1,\ x_2 \ge 0,\quad y \ge 0 &\text{ and integer} \end{aligned}$$
#
# To run it yourself: `pip install gurobipy`. The free licence that comes with `pip install gurobipy`
# is enough for everything here.

# %%
import gurobipy as gp
from gurobipy import GRB

# %% [markdown]
# ## Splitting the problem
#
# Fix $y$ at some value $\hat y$. What is left is an LP in $x$ alone, the **subproblem**, and its dual:
#
# $$\begin{aligned} \min_x\ 2x_1 + 3x_2 \ \text{ s.t. } x_1 + 2x_2 &\ge 3 - \hat y \\ 2x_1 - x_2 &\ge 4 - 3\hat y \\[4pt] \max_u\ (3 - \hat y)u_1 + (4 - 3\hat y)u_2 \ \text{ s.t. } u_1 + 2u_2 &\le 2 \\ 2u_1 - u_2 &\le 3,\quad u \ge 0 \end{aligned}$$
#
# Only the dual's *objective* depends on $\hat y$; its feasible region does not. So any dual-feasible
# $u$ gives, by weak duality, a lower bound on the subproblem's cost for *every* $y$:
#
# $$z \ge (3 - y)u_1 + (4 - 3y)u_2 .$$
#
# That inequality is an **optimality cut**. The **master problem** is $\min\ 2y + z$ over the cuts found
# so far. $u = 0$ is dual-feasible, so the first master starts with the cut $z \ge 0$.
#
# ## The first iteration, by hand
#
# ### The master problem
#
# **Predict:** with only $z \ge 0$ to go on, which $y$ does the master choose, and what is its value?

# %%
master = gp.Model("master")
master.Params.OutputFlag = 0
y = master.addVar(vtype=GRB.INTEGER, name="y")
z = master.addVar(lb=0, name="z")
master.setObjective(2 * y + z, GRB.MINIMIZE)
master.optimize()
y_hat, LB = round(y.X), master.ObjVal
print(f"y = {y_hat:g}, z = {z.X:g}, master value = lower bound = {LB:g}")

# %% [markdown]
# The master value is a lower bound on the true optimum: the master knows the true cost of $y$ but
# only an underestimate of the subproblem's.
#
# ### The dual subproblem
#
# Now price $\hat y$ in the dual. Its feasible region has four corners, $(0,0)$, $(1.5, 0)$, $(0, 1)$
# and $(1.6, 0.2)$. **Predict** which corner wins at $\hat y = 0$.

# %%
dual = gp.Model("dual_sub")
dual.Params.OutputFlag = 0
u = dual.addVars(2, name="u")
dual.addConstr(u[0] + 2 * u[1] <= 2)
dual.addConstr(2 * u[0] - u[1] <= 3)
dual.setObjective((3 - y_hat) * u[0] + (4 - 3 * y_hat) * u[1], GRB.MAXIMIZE)
dual.optimize()
u_hat = [u[0].X, u[1].X]
UB = 2 * y_hat + dual.ObjVal
print(f"u = ({u_hat[0]:g}, {u_hat[1]:g}), subproblem value = {dual.ObjVal:g}, upper bound = {UB:g}")

# %% [markdown]
# $\hat y$ plus its best $x$ is a feasible solution of the whole problem, so its total cost is an upper
# bound. To see that $x$, solve the primal subproblem too. **Predict** its value from the dual's.

# %%
sub = gp.Model("primal_sub")
sub.Params.OutputFlag = 0
x = sub.addVars(2, name="x")
sub.addConstr(x[0] + 2 * x[1] >= 3 - y_hat)
sub.addConstr(2 * x[0] - x[1] >= 4 - 3 * y_hat)
sub.setObjective(2 * x[0] + 3 * x[1], GRB.MINIMIZE)
sub.optimize()
print(f"x = ({x[0].X:g}, {x[1].X:g}), subproblem value = {sub.ObjVal:g}")

# %% [markdown]
# ### The optimality cut
#
# Put $\hat u$ into $z \ge (3 - y)u_1 + (4 - 3y)u_2$ and collect terms in $y$. Add it to the master.

# %%
master.addConstr(z >= (3 - y) * u_hat[0] + (4 - 3 * y) * u_hat[1], name="cut1")
print(f"cut 1: z >= {3 * u_hat[0] + 4 * u_hat[1]:g} - {u_hat[0] + 3 * u_hat[1]:g} y")

# %% [markdown]
# ### The master again
#
# The cut says $y = 0$ costs at least 5.6. **Predict** the master's new $y$ and its new lower bound
# before you run it.

# %%
master.optimize()
print(f"y = {y.X:g}, z = {z.X:g}, lower bound = {master.ObjVal:g} (upper bound still {UB:g})")

# %% [markdown]
# ## Now the streamlined version
#
# One iteration is four steps: master, dual subproblem, bounds, cut. The rest are the same four in a
# loop, which stops when the bounds meet. It starts from scratch, so its first line should match the
# hand-built iteration above.

# %%
master = gp.Model("master")
master.Params.OutputFlag = 0
y = master.addVar(vtype=GRB.INTEGER, name="y")
z = master.addVar(lb=0, name="z")
master.setObjective(2 * y + z, GRB.MINIMIZE)
UB = float("inf")
for it in range(1, 20):
    master.optimize()
    y_hat, LB = round(y.X), master.ObjVal
    dual.setObjective((3 - y_hat) * u[0] + (4 - 3 * y_hat) * u[1], GRB.MAXIMIZE)
    dual.optimize()
    u_hat = [u[0].X, u[1].X]
    UB = min(UB, 2 * y_hat + dual.ObjVal)
    print(f"iter {it}: y = {y_hat:g}  LB = {LB:4.2f}  UB = {UB:4.2f}  u = ({u_hat[0]:g}, {u_hat[1]:g})")
    if UB - LB < 1e-9:
        break
    master.addConstr(z >= (3 - y) * u_hat[0] + (4 - 3 * y) * u_hat[1])
print(f"stopped: y = {y_hat:g}, cost = {UB:g}")

# %% [markdown]
# ### Check against the whole problem
#
# Solve the original model in one piece. **Predict** $y$, $x$ and the cost.

# %%
full = gp.Model("full")
full.Params.OutputFlag = 0
xf = full.addVars(2, name="x")
yf = full.addVar(vtype=GRB.INTEGER, name="y")
full.addConstr(xf[0] + 2 * xf[1] + yf >= 3)
full.addConstr(2 * xf[0] - xf[1] + 3 * yf >= 4)
full.setObjective(2 * xf[0] + 3 * xf[1] + 2 * yf, GRB.MINIMIZE)
full.optimize()
print(f"cost = {full.ObjVal:g}, y = {yf.X:g}, x = ({xf[0].X:g}, {xf[1].X:g})")

# %% [markdown]
# ## When the subproblem can be infeasible: feasibility cuts
#
# In the first example every $\hat y$ left the subproblem feasible. Here the master's integer $x$ can
# use up the first constraint so that no $y \ge 0$ fits:
#
# $$\begin{aligned} \max\ 2x_1 + x_2 + 13x_3 + 7y_1 + 5y_2 \quad \text{s.t.}\quad 9x_1 + 4x_2 + 14x_3 + 35y_1 + 24y_2 &\le 80 \\ -x_1 - 2x_2 + 3x_3 - 3y_1 + 4y_2 &\le 10 \\ x \ge 0 \text{ and integer},\quad y &\ge 0 \end{aligned}$$
#
# With $r_1 = 80 - 9x_1 - 4x_2 - 14x_3$ and $r_2 = 10 + x_1 + 2x_2 - 3x_3$ left over for $y$, the dual
# subproblem is
#
# $$\min\ r_1 u_1 + r_2 u_2 \quad \text{s.t.}\quad 35u_1 - 3u_2 \ge 7,\quad 24u_1 + 4u_2 \ge 5,\quad u \ge 0 .$$
#
# Its region is unbounded. If some direction $d$ in it has $r_1 d_1 + r_2 d_2 < 0$, the dual is
# unbounded, the primal subproblem is infeasible, and the master must be told
# $r_1(x)\, d_1 + r_2(x)\, d_2 \ge 0$: a **feasibility cut**. Such a $d$ is found by an LP over directions,
# scaled so that $d_1 + d_2 = 1$.
#
# This is a maximisation, so the roles flip: the master gives the upper bound, the subproblem the lower.
# The master gets the bounds on $x$ that the first constraint already implies ($9x_1 \le 80$, and so on),
# and $z \le 100$, a cap far above what $y$ can earn ($\tfrac{5}{24} \cdot 80 \approx 16.7$).

# %%
master2 = gp.Model("master2")
master2.Params.OutputFlag = 0
xm = master2.addVars(3, vtype=GRB.INTEGER, ub=[8, 20, 5], name="x")
zm = master2.addVar(lb=-GRB.INFINITY, ub=100, name="z")
master2.setObjective(2 * xm[0] + xm[1] + 13 * xm[2] + zm, GRB.MAXIMIZE)
dual2 = gp.Model("dual_sub2")
dual2.Params.OutputFlag = 0
dual2.Params.DualReductions = 0      # report "unbounded", not "infeasible or unbounded"
v = dual2.addVars(2, name="u")
dual2.addConstr(35 * v[0] - 3 * v[1] >= 7)
dual2.addConstr(24 * v[0] + 4 * v[1] >= 5)
ray = gp.Model("ray")
ray.Params.OutputFlag = 0
d = ray.addVars(2, name="d")
ray.addConstr(35 * d[0] - 3 * d[1] >= 0)
ray.addConstr(24 * d[0] + 4 * d[1] >= 0)
ray.addConstr(d[0] + d[1] == 1)
for mdl in (master2, dual2, ray):
    mdl.update()
print("master2:", master2.NumVars, "variables | dual2:", dual2.NumConstrs, "constraints | ray:", ray.NumConstrs, "constraints")

# %% [markdown]
# The loop is the one above with one more branch. **Predict:** the first master has no cuts, only the
# bounds. What $x$ does it choose, and which kind of cut does that $x$ earn?

# %%
r1 = 80 - 9 * xm[0] - 4 * xm[1] - 14 * xm[2]      # expressions in the master's x
r2 = 10 + xm[0] + 2 * xm[1] - 3 * xm[2]
LB = float("-inf")
for it in range(1, 20):
    master2.optimize()
    x_hat, UB = [round(xm[i].X) for i in range(3)], master2.ObjVal
    r_hat = (r1.getValue(), r2.getValue())
    dual2.setObjective(r_hat[0] * v[0] + r_hat[1] * v[1], GRB.MINIMIZE)
    dual2.optimize()
    if dual2.Status == GRB.OPTIMAL:
        LB = max(LB, 2 * x_hat[0] + x_hat[1] + 13 * x_hat[2] + dual2.ObjVal)
        w, kind = (v[0].X, v[1].X), "optimality"
        cut = zm <= r1 * w[0] + r2 * w[1]
    else:
        ray.setObjective(r_hat[0] * d[0] + r_hat[1] * d[1], GRB.MINIMIZE)
        ray.optimize()
        w, kind = (d[0].X, d[1].X), "feasibility"
        cut = r1 * w[0] + r2 * w[1] >= 0
    label = "no cut, bounds met" if UB - LB < 1e-6 else f"{kind} cut"
    print(f"iter {it}: x = {x_hat}  UB = {UB:5.1f}  LB = {LB:5.1f}  {label:18s} u = ({w[0]:.4f}, {w[1]:.4f})")
    if UB - LB < 1e-6:
        break
    master2.addConstr(cut)
print(f"bounds met: x = {x_hat}, value = {LB:g}")

# %% [markdown]
# **Predict** the optimum of the whole problem, then check it.

# %%
full2 = gp.Model("full2")
full2.Params.OutputFlag = 0
xf = full2.addVars(3, vtype=GRB.INTEGER, name="x")
yf = full2.addVars(2, name="y")
full2.addConstr(9 * xf[0] + 4 * xf[1] + 14 * xf[2] + 35 * yf[0] + 24 * yf[1] <= 80)
full2.addConstr(-xf[0] - 2 * xf[1] + 3 * xf[2] - 3 * yf[0] + 4 * yf[1] <= 10)
full2.setObjective(2 * xf[0] + xf[1] + 13 * xf[2] + 7 * yf[0] + 5 * yf[1], GRB.MAXIMIZE)
full2.optimize()
print(f"value = {full2.ObjVal:g}, x = {[round(xf[i].X) for i in range(3)]}, y = ({yf[0].X:g}, {yf[1].X:g})")

# %% [markdown]
# - In the first example the master tried $y = 0$, then $y = 2$, then $y = 1$. With one cut, why did
#   it jump past 1 to 2?
# - The second master starts at $x = (8, 20, 5)$, far outside what fits. What would the loop do
#   without the feasibility branch?
# - The second dual subproblem's region has two corners and two edge directions that run off to
#   infinity. Which of the four did the loop use, and did it ever need the others?
