# ---
# title: Quadratic Programming Examples and Algorithms
# description: Gradient descent built by hand, a quadratic program in standard form with its convexity checked from the eigenvalues of Q, a few interior-point steps, and the same problem solved by Gurobi, in Python.
# course: IE 5301 Advanced Operations Research
# first: January 7, 2020 (in R)
# related: https://github.com/sear-labs/teaching-code/tree/main/notebooks/06_nonlinear_and_convex|the nonlinear and convex notebooks in the lab's teaching library
# ---

# %% [markdown]
# A quadratic program (QP) has a quadratic objective and linear constraints. This lesson starts with
# the simplest way to minimise a smooth function, gradient descent, then writes one QP in standard
# form, checks that it is convex, and solves it three ways: by gradient descent (which ignores the
# constraints), by a few interior-point steps (which does not), and by Gurobi.
#
# $$\begin{aligned} \min\ z = x_1^2 + 4x_2^2 - 8x_1 - 16x_2 \quad \text{s.t.}\quad x_1 + x_2 &\le 5 \\ x_1 &\le 3 \\ x_1,\ x_2 &\ge 0 \end{aligned}$$
#
# To run it yourself: `pip install gurobipy numpy matplotlib`. The free licence that comes with
# `pip install gurobipy` is enough for everything here.

# %%
import numpy as np
import matplotlib.pyplot as plt
import gurobipy as gp
from gurobipy import GRB

# %% [markdown]
# ## Gradient descent: a first-order method
#
# Start with one variable, $f(x) = x^2$, whose derivative is $f'(x) = 2x$. The derivative points
# uphill, so step the other way, by a step size $\lambda$:
#
# $$x_{k+1} = x_k - \lambda\, f'(x_k)$$
#
# It is called first-order because it uses only the first derivative. Start at $x_0 = 10$ with
# $\lambda = 0.2$ and take one step by hand.

# %%
x = 10.0
lam = 0.2
slope = 2 * x
x = x - lam * slope
print(f"slope at 10 = {slope:g}, new x = {x:g}, f(x) = {x**2:g}")

# %% [markdown]
# Now repeat until the slope is almost zero. **Predict:** how many steps until $|f'(x)| < 10^{-6}$?

# %%
x = 10.0
steps = 0
while abs(2 * x) >= 1e-6:
    x = x - lam * 2 * x
    steps += 1
    if steps <= 4:
        print(f"step {steps}: x = {x:.4f}")
print(f"stopped after {steps} steps at x = {x:.2e}")

# %% [markdown]
# Each step multiplies $x$ by the same number. Which number, and what does it have to do with
# $\lambda$? **Predict** where $x$ is after ten steps for each step size below, before you run it.

# %%
for lam_try in [0.1, 0.5, 0.9, 1.0, 1.1]:
    x = 10.0
    for k in range(10):
        x = x - lam_try * 2 * x
    print(f"lambda = {lam_try:3.1f}: x after 10 steps = {x:8.3f}")

# %% [markdown]
# ## A quadratic program in standard form
#
# Every QP can be written as
#
# $$\min\ \tfrac12 x^\top Q x + c^\top x \quad \text{s.t.}\quad Ax = b,\ x \ge 0,$$
#
# where $Q$ is symmetric. The $\tfrac12$ means the diagonal of $Q$ holds twice the squared terms'
# coefficients: $x_1^2 + 4x_2^2$ becomes $Q_{11} = 2,\ Q_{22} = 8$. Two slack variables $x_3, x_4$
# turn the inequalities into equations, and they do not appear in the objective.

# %%
Q = np.diag([2.0, 8.0, 0.0, 0.0])
c = np.array([-8.0, -16.0, 0.0, 0.0])
A = np.array([[1.0, 1.0, 1.0, 0.0],
              [1.0, 0.0, 0.0, 1.0]])
b = np.array([5.0, 3.0])
print("Q is", Q.shape, "| A is", A.shape, "| b =", b, "| c =", c)

# %% [markdown]
# ### Is it convex?
#
# A QP is convex when $Q$ is positive semidefinite: every eigenvalue $\ge 0$. Then any local minimum
# is the global one. A second QP, $\min\ 4x_1^2 + 4x_2^2 - 2x_1x_2 - 12x_1 - 72x_2$, has a cross term,
# so its $Q$ is not diagonal: the $-2x_1x_2$ is split as $-2$ in both off-diagonal places.
# **Predict** the signs of both sets of eigenvalues.

# %%
Q_second = np.array([[8.0, -2.0],
                     [-2.0, 8.0]])
print("eigenvalues of Q:       ", np.linalg.eigvalsh(Q))
print("eigenvalues of Q_second:", np.linalg.eigvalsh(Q_second))

# %% [markdown]
# ## Gradient descent in two variables
#
# Drop the slacks and the constraints for now. The gradient of $\tfrac12 x^\top Q x + c^\top x$ is
# $Qx + c$, and the step is the same as before: $x_{k+1} = x_k - \lambda (Q x_k + c)$. One step from
# the origin, with $\lambda = 0.2$:

# %%
Q2, c2 = Q[:2, :2], c[:2]
x = np.array([0.0, 0.0])
grad = Q2 @ x + c2
x = x - lam * grad
print("gradient at origin =", grad, "| new x =", x, "| z =", round(0.5 * x @ Q2 @ x + c2 @ x, 4))

# %% [markdown]
# Repeat it 25 times and keep the path. **Predict:** where does it end, and does it go straight there?

# %%
x = np.array([0.0, 0.0])
gd_path = [x.copy()]
for k in range(25):
    x = x - lam * (Q2 @ x + c2)
    gd_path.append(x.copy())
gd_path = np.array(gd_path)
print(np.round(gd_path[:5], 3))
print("after 25 steps: x =", np.round(x, 4), "| z =", round(0.5 * x @ Q2 @ x + c2 @ x, 4))

# %% [markdown]
# The path on the contours of $z$, with the feasible region shaded.

# %%
g1, g2 = np.meshgrid(np.linspace(-0.5, 5.5, 200), np.linspace(-0.5, 5.2, 200))
zz = g1**2 + 4 * g2**2 - 8 * g1 - 16 * g2
region = np.array([[0, 0], [3, 0], [3, 2], [0, 5]])
fig, ax = plt.subplots(figsize=(6, 4.2))
cs = ax.contour(g1, g2, zz, levels=[-31, -28, -24, -18, -10, 0], colors="0.5", linewidths=0.8)
ax.clabel(cs, fontsize=7)
ax.fill(region[:, 0], region[:, 1], alpha=0.2, label="feasible region")
ax.plot(gd_path[:, 0], gd_path[:, 1], "o-", markersize=3, label="gradient descent")
ax.annotate("(4, 2)", (4, 2), textcoords="offset points", xytext=(6, -10), fontsize=8)
ax.set(xlim=(-0.5, 5.5), ylim=(-0.5, 5.2), xlabel="$x_1$", ylabel="$x_2$")
ax.legend(loc="lower right", fontsize=8)
plt.show()
# alt: Elliptical contours of z centred on (4, 2); gradient descent starts at the origin, zig-zags up and down in x2 while moving steadily right in x1, and settles at (4, 2), which lies outside the shaded feasible region with corners (0,0), (3,0), (3,2) and (0,5).

# %% [markdown]
# Gradient descent found the bottom of the bowl. Check that point against the two constraints.

# %%
print("x1 + x2 =", round(x[0] + x[1], 4), "(limit 5) | x1 =", round(x[0], 4), "(limit 3)")

# %% [markdown]
# ## An interior-point method, a few steps by hand
#
# To respect the constraints, go back to standard form and solve the optimality (KKT) conditions
# with Newton's method, as in [the LP lesson](/resources/lp-algorithms/). The only change from LP is that the stationarity
# condition now has $Qx$ in it:
#
# $$\begin{aligned} Qx + c - A^\top y - s &= 0 \\ Ax &= b \\ x_i s_i &= \mu,\quad x, s > 0 \end{aligned}$$
#
# Each step aims at a smaller $\mu$ (the factor `sigma`) and moves 90% of the way to the boundary.
# Start from a strictly positive point that satisfies $Ax = b$.

# %%
x = np.array([1.0, 1.0, 3.0, 2.0])
s = np.ones(4)
y = np.zeros(2)
print("start: A @ x - b =", A @ x - b, "| z =", 0.5 * x @ Q @ x + c @ x)

# %% [markdown]
# **Predict:** after ten steps, how close to a corner of the feasible region will $(x_1, x_2)$ be,
# and which corner?

# %%
ip_path = [x[:2].copy()]
sigma = 0.2
for k in range(10):
    mu = x @ s / 4
    K = np.block([[-Q, A.T, np.eye(4)],
                  [A, np.zeros((2, 2)), np.zeros((2, 4))],
                  [np.diag(s), np.zeros((4, 2)), np.diag(x)]])
    rhs = np.concatenate([Q @ x + c - A.T @ y - s, b - A @ x, sigma * mu - x * s])
    d = np.linalg.solve(K, rhs)
    dx, dy, ds = d[:4], d[4:6], d[6:]
    shrink = [1.0] + [-v / dv for v, dv in zip(np.r_[x, s], np.r_[dx, ds]) if dv < 0]
    alpha = 0.9 * min(shrink)
    x, y, s = x + alpha * dx, y + alpha * dy, s + alpha * ds
    ip_path.append(x[:2].copy())
    print(f"step {k + 1:2d}: x1 = {x[0]:.4f}, x2 = {x[1]:.4f}, z = {0.5 * x @ Q @ x + c @ x:8.4f}, mean x*s = {x @ s / 4:.1e}")

# %% [markdown]
# The dual prices $y$ belong to the two constraints. Keep them for the end.

# %%
print("y =", np.round(y, 4))

# %% [markdown]
# Both paths on one picture.

# %%
ip_path = np.array(ip_path)
fig, ax = plt.subplots(figsize=(6, 4.2))
cs = ax.contour(g1, g2, zz, levels=[-31, -28, -24, -18, -10, 0], colors="0.5", linewidths=0.8)
ax.clabel(cs, fontsize=7)
ax.fill(region[:, 0], region[:, 1], alpha=0.2, label="feasible region")
ax.plot(gd_path[:, 0], gd_path[:, 1], "o-", markersize=3, label="gradient descent (no constraints)")
ax.plot(ip_path[:, 0], ip_path[:, 1], "s--", markersize=4, label="interior point")
ax.set(xlim=(-0.5, 5.5), ylim=(-0.5, 5.2), xlabel="$x_1$", ylabel="$x_2$")
ax.legend(loc="lower right", fontsize=8)
plt.show()
# alt: Gradient descent zig-zags from the origin to (4, 2) outside the shaded region, while the interior-point path starts at (1, 1) inside the region and moves up and to the right into the corner (3, 2), where the z = -31 contour touches the region.

# %% [markdown]
# ## Gurobi
#
# The same QP in GurobiPy, written with the inequalities directly; Gurobi adds its own slacks. It is
# solved twice, once by each of two algorithms. **Predict the objective value and the duals before
# you run it.**

# %%
m = gp.Model("qp")
xv = m.addVars(2, name="x")
m.setObjective(xv[0] * xv[0] + 4 * xv[1] * xv[1] - 8 * xv[0] - 16 * xv[1], GRB.MINIMIZE)
m.addConstr(xv[0] + xv[1] <= 5, name="sum")
m.addConstr(xv[0] <= 3, name="x1cap")
m.Params.OutputFlag = 0
for method, name in [(2, "barrier"), (0, "primal simplex")]:
    m.reset()
    m.Params.Method = method
    m.optimize()
    duals = [round(con.Pi, 4) for con in m.getConstrs()]
    print(f"{name:14s} z = {m.ObjVal:.6f}  x = {[round(v.X, 6) for v in xv.values()]}  duals = {duals}")

# %% [markdown]
# Gurobi has both families for a QP too: `Method = 2` is its barrier (interior-point) method and
# `Method = 0` is a simplex method adapted to QPs. Compare both rows with your interior-point steps and
# with $y$.
#
# - The constraint $x_1 + x_2 \le 5$ has no slack left, yet its dual is zero. Look at where the
#   bowl's centre sits relative to that line: why does pushing it outward not help?
# - Raise the cap on $x_1$ from 3 to 3.5. Predict the new $z$ from the dual, then re-solve. Why is
#   the prediction no longer exact, as it was for an LP?
# - Change the objective to $x_1^2 - 4x_2^2 - 8x_1 - 16x_2$. What do the eigenvalues of $Q$ say, and
#   where does gradient descent go?
