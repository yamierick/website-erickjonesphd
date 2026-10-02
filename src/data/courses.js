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
      { title: "A Toy Linked Model", url: "/recovery-loop/", note: "battery demand, mining and end-of-life recovery" },
      { title: "Too Late to Decide", url: "/lead-time/", note: "why a mine started today arrives in the 2040s" },
      { title: "The Texas grid", url: "/demos/texas-grid/", note: "where ERCOT's power is made and where demand is going" },
    ],
    materials: [],
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
    book: { title: "Operations Research: An Introduction, 10th edition", by: "Hamdy Taha", note: "free through the UTA library" },
    interactive: [],
    materials: ["lp-algorithms", "gurobi-examples", "gurobi-examples-2"],
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
    book: { title: "Operations Research: An Introduction, 10th edition", by: "Hamdy Taha", note: "free through the UTA library" },
    interactive: [],
    materials: ["qp-modeling", "markov-chains", "simulation-basics", "bender-decomp", "decomp-algorithms"],
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
  },
];

// Materials from before UT Arlington, kept with the teaching they came from.
export const earlier = ["city-modeling", "sci-res-city", "austin-land-use", "slsdesign"];
