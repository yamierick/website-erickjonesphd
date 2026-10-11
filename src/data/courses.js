/**
 * The courses on /teaching/, one page each, taken from the current syllabi:
 *   REE 4301  Classes\REE 4301 - Energy System Modeling\2026 Fall\2026-Fall-REE-4301-001-IE-5300.docx
 *   IE 3315   Classes\IE 3315 - OR 1\2026 Fall\2026-Fall-IE-3315-XXX.docx
 *   IE 5301   Classes\IE 5301 - Advanced OR\2026 Fall\2026_Fall_IE_5301_001.docx
 *   IE 3301   Classes\IE 3301 - Probability and Stat\2025 Spring\2025-SPRING_2252-IE-3301-005.docx
 * When a syllabus changes, update its entry here; nothing else needs editing.
 *
 * Materials are the R Markdown worked examples in public/resources/. They keep
 * their own URLs so older links still work, and one can belong to two courses.
 *
 * `concepts` are short definitions of each course's core ideas, written for
 * the page in plain words (Energy Systems Modeling's follow Jones's open
 * textbook draft). `resources` are free tools, readings and data gathered from
 * his course folders (2026-10-11 survey); every link was checked to resolve
 * that day. Nothing here comes from exams, keys or colleagues' slides.
 */
export const materials = {
  "stat-basics":       "Statistic basics and linear regression",
  "simulation-basics": "The basics of simulation",
  "lp-algorithms":     "Linear programming examples and applications",
  "markov-chains":     "Basics of Markov chains",
  "gurobi-examples":   "Gurobi basic LP/MIP examples",
  "gurobi-examples-2": "Gurobi's R examples 2",
  "qp-modeling":       "Quadratic programming examples and algorithms",
  "bender-decomp":     "Benders decomposition explained",
  "decomp-algorithms": "Decomposition algorithms broken down and explained",
  "city-modeling":     "Monocentric city modeling",
  "sci-res-city":      "Sim CCS City",
  "austin-land-use":   "Austin land use",
  "slsdesign":         "Selective laser sintering: wind-powered tops",
};

export const courses = [
  {
    slug: "energy-systems-modeling",
    code: "REE 4301 / IE 5300",
    title: "Energy Systems Modeling",
    since: "2026–",
    line: "Building mathematical models of real energy systems, from demand and generation to networks, storage and material supply chains.",
    description:
      "Many of the most pressing energy challenges cross traditional disciplinary boundaries and call for systems models to analyze possible solutions. "
      + "This course shows how to construct such models, with particular emphasis on models that combine engineering, economics, the natural sciences and policy, "
      + "using optimization, simulation, machine learning, decision analysis, stochastic processes and dynamical systems. Students learn to build "
      + "mathematical models of complex, real-world energy problems.",
    modules: [
      ["Demand", "residential, commercial, industrial and transportation"],
      ["Generation", "the electricity system, fossil fuels and other sources"],
      ["Networks", "transmission, distribution and pipelines"],
      ["Storage and supply chains", "batteries, oil and gas, other storage, and material flows"],
    ],
    topics: [
      "Energy accounting, units, conversions and Sankey diagrams",
      "Demand modeling, load profiles and representative days",
      "Dispatch and investment economics: merit order, heat rate, LCOE, capital recovery",
      "Network modeling: DC power flow, losses, distribution and pipelines",
      "Storage and material supply chains",
      "Reliability, risk and safety; engineering economy",
      "Scenario and sensitivity analysis, and model validation",
    ],
    work: [
      "Four mini-projects, one per module (40%)",
      "A final integrated project: a report and presentation that brings every module together (20%)",
      "Two mini-exams (30%)",
      "Assignments and participation (10%)",
    ],
    tools: "Python in Google Colab, and Excel. Generative AI is encouraged for coding, presentations and proofreading, but not for drafting reports or hand-worked homework.",
    graduate: [
      "Collect global energy and supply-chain data from international sources such as the IEA",
      "Run research-grade models such as ReEDS, GenX, PyPSA and BEopt",
      "Validate model results, and run scenario and sensitivity analysis",
      "Produce publication-quality reports and presentations",
    ],
    book: { title: "Introduction to Energy System Modeling", by: "Erick Jones, Mavs Open Press", url: "https://uta.pressbooks.pub/energysystemmodeling/", note: "in progress" },
    note: "A companion graduate course, Energy Systems and Critical Mineral Supply Chain Modeling (IE 6301), begins in Fall 2026.",
    interactive: [
      { title: "What a Grid Is Made Of", url: "/materials/", note: "energy demand to generation to the metal and rock behind it" },
      { title: "Why Supply Can't Catch Up", url: "/supply-gap/", note: "why recycling cannot ramp, and why a mine started today arrives in the 2040s" },
      { title: "The Texas grid", url: "/demos/texas-grid/", note: "where ERCOT's power is made and where demand is going" },
      { title: "Accurate, and Still Wrong", url: "/linked-models/", note: "why linking a planning model to a supply-chain model needs more than a good fit" },
    ],
    materials: [],
    concepts: [
      ["Model", "A stylized, simplified mathematical representation of one slice of reality, built to answer a specific question."],
      ["Parameters and decision variables", "Parameters are the data, fixed before the model is solved; decision variables are what the solver chooses."],
      ["Infeasible and unbounded", "Infeasible: no answer satisfies every constraint. Unbounded: the objective can keep improving forever, which usually means a constraint is missing."],
      ["Capacity factor", "A plant's actual output over a period divided by what it would produce running flat out for the whole period."],
      ["Heat rate", "A thermal plant's efficiency: the fuel energy, in BTU, it burns to make one kWh of electricity. Lower is better."],
      ["Levelized cost of energy (LCOE)", "Capital, operating and fuel costs over a plant's life, discounted to today and divided by the energy it produces."],
      ["Merit order", "Dispatching plants from cheapest to most expensive running cost until demand is met; the last plant needed sets the price."],
      ["Price taker and price maker", "A facility too small to move the market price is a price taker; one large enough to move it is a price maker."],
    ],
    resources: [
      { group: "Learn", title: "Data Science for Energy System Modelling", url: "https://open-energy-transition.github.io/data-science-for-esm/intro.html", note: "free online course in Python" },
      { group: "Learn", title: "PyPSA learning materials", url: "https://docs.pypsa.org/latest/user-guide/learning-materials/" },
      { group: "Learn", title: "Energy Systems, TU Berlin (Tom Brown)", url: "https://nworbmot.org/courses/es-22/", note: "lecture slides and exercises" },
      { group: "Learn", title: "How Energy Modeling Works", url: "https://www.cesa.org/wp-content/uploads/How-Energy-Modeling-Works.pdf", note: "Clean Energy States Alliance primer" },
      { group: "Learn", title: "EIA Energy Explained", url: "https://www.eia.gov/energyexplained/" },
      { group: "Models and solvers", title: "PyPSA-USA", url: "https://pypsa-usa.readthedocs.io/en/latest/" },
      { group: "Models and solvers", title: "GenX", url: "https://github.com/GenXProject/GenX.jl" },
      { group: "Models and solvers", title: "PowerGenome", url: "https://github.com/PowerGenome/PowerGenome" },
      { group: "Models and solvers", title: "OSeMOSYS", url: "https://osemosys.readthedocs.io/en/latest/" },
      { group: "Models and solvers", title: "PuLP", url: "https://coin-or.github.io/pulp/" },
      { group: "Models and solvers", title: "HiGHS", url: "https://highs.dev/", note: "free, fast open-source solver" },
      { group: "Data", title: "PUDL open energy data", url: "https://docs.catalyst.coop/pudl/en/latest/data_access.html", note: "Catalyst Cooperative" },
      { group: "Data", title: "PyPSA technology data", url: "https://github.com/PyPSA/technology-data", note: "costs and efficiencies" },
      { group: "Data", title: "TX-123BT synthetic Texas grid", url: "https://rpglab.github.io/resources/TX-123BT/" },
      { group: "Data", title: "LLNL energy flow charts", url: "https://flowcharts.llnl.gov/", note: "Sankey diagrams of U.S. energy" },
    ],
  },
  {
    slug: "operations-research",
    code: "IE 3315",
    title: "Operations Research I",
    since: "2023–",
    line: "The major deterministic techniques of operations research, and how to use them to make better decisions.",
    description:
      "An introduction to the major deterministic techniques of operations research and their application to decision problems, "
      + "focused on improving modeling and decision-making skills.",
    topics: [
      "Linear programming: the simplex and interior-point methods",
      "Integer programming and branch-and-bound",
      "Convex and nonlinear programming",
      "Network analysis, and transportation and assignment problems",
      "Game theory",
      "Sensitivity and trade-off analysis",
    ],
    work: [
      "Three exams (60%)",
      "A team project that applies the course to a real problem (25%)",
      "Homework, mostly computer assignments done in groups (10%)",
      "Individual quizzes (5%)",
    ],
    tools: "Optimization modeling in Python and Excel, visualization, and formal report writing.",
    book: { title: "Operations Research: An Introduction, 10th edition", by: "Hamdy Taha", note: "available through the UTA library" },
    interactive: [],
    materials: ["lp-algorithms", "gurobi-examples", "gurobi-examples-2"],
    concepts: [
      ["Linear program (LP)", "Maximizing or minimizing a linear objective subject to linear constraints."],
      ["Feasible and optimal", "A feasible solution satisfies every constraint; an optimal one is feasible and provably has the best objective value."],
      ["Basic solution", "A corner point of the feasible region, found by setting the non-basic variables to zero; the simplex method moves from one corner to a better neighbour."],
      ["Duality and shadow prices", "Every LP has a dual whose optimal values price each constraint: how much the objective would improve per unit of extra resource."],
      ["Sensitivity analysis", "How far a cost or a right-hand side can change before the optimal solution changes."],
      ["Integer program", "An LP in which some variables must be whole numbers; solved by branch-and-bound, which splits the problem and discards branches that cannot beat the best answer so far."],
      ["Network flow", "Problems on nodes and arcs, such as shortest path, transportation and assignment, that often have special, fast solution methods."],
      ["Pareto optimal", "A solution in which no objective can be improved without making another worse."],
    ],
    resources: [
      { group: "Learn", title: "Gurobi Burrito Optimization Game", url: "https://www.gurobi.com/academics/burrito-game", note: "learn facility location by playing" },
      { group: "Learn", title: "Linear Algebra, MIT OpenCourseWare (Gilbert Strang)", url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/" },
      { group: "Tools", title: "Pyomo", url: "https://www.pyomo.org/", note: "optimization modelling in Python" },
      { group: "Tools", title: "PuLP", url: "https://coin-or.github.io/pulp/" },
      { group: "Tools", title: "HiGHS", url: "https://highs.dev/", note: "free open-source LP and MIP solver" },
      { group: "Tools", title: "Gurobi documentation", url: "https://docs.gurobi.com/current/", note: "free academic licences for students" },
      { group: "Tools", title: "Google Colab", url: "https://colab.research.google.com/", note: "Python in the browser, nothing to install" },
    ],
  },
  {
    slug: "advanced-operations-research",
    code: "IE 5301",
    title: "Advanced Operations Research",
    since: "2023–",
    line: "A graduate survey of deterministic and stochastic methods for modeling and decision-making.",
    description:
      "A survey of quantitative methods for modeling and decision-making, deterministic and stochastic, for graduate students.",
    topics: [
      "Linear, integer and convex programming: simplex, interior point, branch-and-bound",
      "Network analysis, facility location, and transportation and assignment problems",
      "Nonlinear and multi-objective programming, and game theory",
      "Decision trees and Monte Carlo simulation",
      "Markov chains and queuing theory",
    ],
    work: [
      "Exams on deterministic and stochastic operations research, and a final (60%)",
      "A team project that applies the course to a dataset, with a report and presentation (25%)",
      "Homework, mostly computer assignments done in groups (10%)",
      "Quizzes and short assignments (5%)",
    ],
    tools: "Optimization modeling in Python and Excel; stochastic modeling, visualization and reports in R and R Markdown.",
    book: { title: "Operations Research: An Introduction, 10th edition", by: "Hamdy Taha", note: "available through the UTA library" },
    interactive: [
      { title: "Accurate, and Still Wrong", url: "/linked-models/", note: "a Gaussian-process surrogate linking two optimization models" },
    ],
    materials: ["qp-modeling", "markov-chains", "simulation-basics", "bender-decomp", "decomp-algorithms"],
    concepts: [
      ["Problem classes", "LP, MILP (some integer variables), NLP (nonlinear), QP (quadratic objective) and MINLP: the class decides which solver can be trusted to find the optimum."],
      ["KKT conditions", "The conditions a solution of a smooth constrained problem must satisfy; for convex problems they are also enough to prove it optimal."],
      ["Decomposition", "Splitting a large problem into a master problem and subproblems that pass information back and forth, as in Benders decomposition and column generation."],
      ["Stochastic program", "An optimization model whose data are uncertain, with some decisions made now and others after the uncertainty is revealed."],
      ["Value of the stochastic solution (VSS)", "How much better the stochastic solution does than planning on the average scenario; the expected-value approach assumes the future will equal the historical average."],
      ["Markov chain", "A system that moves between states with probabilities that depend only on the current state."],
      ["Queue utilization", "ρ = λ/μ, the arrival rate over the service rate; as it approaches 1, waiting times grow without bound."],
    ],
    resources: [
      { group: "Learn", title: "Sequential Decision Analytics and Modeling (Warren Powell)", url: "https://castle.princeton.edu/sda/", note: "free book and course material" },
      { group: "Learn", title: "Stochastic Programming Society", url: "https://www.stoprog.org/", note: "tutorials and references" },
      { group: "Learn", title: "KKT conditions, APMonitor", url: "http://apmonitor.com/me575/index.php/Main/KuhnTucker" },
      { group: "Learn", title: "Column generation, explained", url: "https://www.science4all.org/article/column-generation/" },
      { group: "Learn", title: "Queueing with simmer in R", url: "https://r-simmer.org/articles/simmer-06-queueing.html" },
      { group: "Tools", title: "Gurobi documentation", url: "https://docs.gurobi.com/current/", note: "free academic licences for students" },
      { group: "Tools", title: "Pyomo", url: "https://www.pyomo.org/" },
      { group: "Tools", title: "NetworkX", url: "https://networkx.org/", note: "graphs and networks in Python" },
    ],
  },
  {
    slug: "engineering-probability",
    code: "IE 3301",
    title: "Engineering Probability",
    since: "2021–",
    line: "Probability and statistics applied to problems in engineering, operations and everyday life.",
    description:
      "How to apply probability and statistics to a wide range of problems in engineering, sustainability and life, "
      + "with applications in random processes, reliability, inventory systems and queuing.",
    topics: [
      "Absolute and conditional probability",
      "Discrete and continuous random variables",
      "Parameter estimation",
      "Hypothesis testing",
      "An introduction to linear regression",
    ],
    work: [
      "Three tests (60%)",
      "A team project (25%)",
      "Homework (10%)",
      "Quizzes (5%)",
    ],
    tools: "Statistical analysis in R and in spreadsheets such as Excel.",
    book: { title: "Probability and Statistics for Engineers and Scientists, 9th edition", by: "Walpole, Myers, Myers and Ye" },
    interactive: [],
    materials: ["stat-basics", "simulation-basics"],
    concepts: [
      ["Random variable", "A number whose value depends on chance, described by its distribution: discrete (counts) or continuous (measurements)."],
      ["Conditional probability", "The probability of A given that B has happened: P(A | B) = P(A and B) / P(B)."],
      ["Expected value and variance", "The long-run average of a random variable, and how widely it spreads around that average."],
      ["Confidence interval", "A range built from a sample that, over many samples, would contain the true parameter a stated share of the time."],
      ["Prediction interval", "A range where the next single observation is likely to fall; wider than a confidence interval for the mean."],
      ["Type I and Type II errors", "Type I: rejecting a true null hypothesis, with probability α. Type II: failing to reject a false one, with probability β. The power of a test is 1 − β."],
      ["p-value", "Assuming the null hypothesis is true, the probability of a result at least as extreme as the one observed."],
    ],
    resources: [
      { group: "Learn", title: "Introduction to Probability, Statistics, and Random Processes (Pishro-Nik)", url: "https://www.probabilitycourse.com/", note: "free online textbook" },
      { group: "Learn", title: "NIST/SEMATECH e-Handbook of Statistical Methods", url: "https://www.itl.nist.gov/div898/handbook/" },
      { group: "Learn", title: "Statistics by Jim", url: "https://statisticsbyjim.com/hypothesis-testing/one-tailed-two-tailed-hypothesis-tests/", note: "plain-language explanations" },
      { group: "Learn", title: "Linear regression in Python, Real Python", url: "https://realpython.com/linear-regression-in-python/" },
      { group: "Tools", title: "R distribution functions, a quick reference", url: "https://www.stat.umn.edu/geyer/5101/examp/rlook.html" },
      { group: "Tools", title: "Posit Cloud", url: "https://posit.cloud/", note: "R and RStudio in the browser" },
      { group: "Tools", title: "Google Colab", url: "https://colab.research.google.com/", note: "Python in the browser" },
    ],
  },
];

// Materials from before UT Arlington, kept with the teaching they came from.
export const earlier = ["city-modeling", "sci-res-city", "austin-land-use", "slsdesign"];
