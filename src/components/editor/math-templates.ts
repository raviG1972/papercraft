export interface MathTemplate {
  id: string;
  name: string;
  latex: string;
  category: string;
  icon?: string;
}

export interface MathCategory {
  id: string;
  name: string;
  icon: string;
}

export const mathCategories: MathCategory[] = [
  { id: 'basic', name: 'Basic', icon: 'Σ' },
  { id: 'fractions', name: 'Fractions', icon: '½' },
  { id: 'powers', name: 'Powers & Roots', icon: '√' },
  { id: 'trig', name: 'Trigonometry', icon: 'θ' },
  { id: 'calculus', name: 'Calculus', icon: '∫' },
  { id: 'sums', name: 'Sums & Products', icon: 'Π' },
  { id: 'matrices', name: 'Matrices', icon: '▢' },
  { id: 'brackets', name: 'Brackets', icon: '⟨⟩' },
  { id: 'logic', name: 'Relations & Logic', icon: '∈' },
  { id: 'greek', name: 'Greek Letters', icon: 'α' },
  { id: 'arrows', name: 'Arrows', icon: '→' },
  { id: 'common', name: 'Common Equations', icon: 'f(x)' },
];

export const mathTemplates: MathTemplate[] = [
  // Basic
  { id: 'b1', name: 'Inline Math', latex: '\\placeholder', category: 'basic' },
  { id: 'b2', name: 'Simple Variable', latex: 'x = \\placeholder', category: 'basic' },
  { id: 'b3', name: 'Addition', latex: '\\placeholder + \\placeholder = \\placeholder', category: 'basic' },
  { id: 'b4', name: 'Multiplication', latex: '\\placeholder \\times \\placeholder = \\placeholder', category: 'basic' },
  { id: 'b5', name: 'Division Sign', latex: '\\placeholder \\div \\placeholder = \\placeholder', category: 'basic' },

  // Fractions
  { id: 'f1', name: 'Simple Fraction', latex: '\\frac{\\placeholder}{\\placeholder}', category: 'fractions' },
  { id: 'f2', name: 'Fraction with Sum', latex: '\\frac{\\placeholder + \\placeholder}{\\placeholder}', category: 'fractions' },
  { id: 'f3', name: 'Complex Fraction', latex: '\\frac{\\placeholder}{\\placeholder + \\frac{\\placeholder}{\\placeholder}}', category: 'fractions' },
  { id: 'f4', name: 'Mixed Number', latex: '\\placeholder \\frac{\\placeholder}{\\placeholder}', category: 'fractions' },
  { id: 'f5', name: 'Binomial Fraction', latex: '\\frac{\\placeholder^2 \\pm \\placeholder}{\\placeholder}', category: 'fractions' },

  // Powers & Roots
  { id: 'p1', name: 'Superscript', latex: '\\placeholder^{\\placeholder}', category: 'powers' },
  { id: 'p2', name: 'Subscript', latex: '\\placeholder_{\\placeholder}', category: 'powers' },
  { id: 'p3', name: 'Square Root', latex: '\\sqrt{\\placeholder}', category: 'powers' },
  { id: 'p4', name: 'Nth Root', latex: '\\sqrt[\\placeholder]{\\placeholder}', category: 'powers' },
  { id: 'p5', name: 'Power of Fraction', latex: '\\left(\\frac{\\placeholder}{\\placeholder}\\right)^{\\placeholder}', category: 'powers' },
  { id: 'p6', name: 'Negative Power', latex: '\\placeholder^{-\\placeholder}', category: 'powers' },

  // Trigonometry
  { id: 't1', name: 'sin(x)', latex: '\\sin\\left(\\placeholder\\right)', category: 'trig' },
  { id: 't2', name: 'cos(x)', latex: '\\cos\\left(\\placeholder\\right)', category: 'trig' },
  { id: 't3', name: 'tan(x)', latex: '\\tan\\left(\\placeholder\\right)', category: 'trig' },
  { id: 't4', name: 'sin² + cos² = 1', latex: '\\sin^2\\left(\\placeholder\\right) + \\cos^2\\left(\\placeholder\\right) = 1', category: 'trig' },
  { id: 't5', name: 'sin(a+b)', latex: '\\sin\\left(\\placeholder + \\placeholder\\right)', category: 'trig' },
  { id: 't6', name: 'cot(x)', latex: '\\cot\\left(\\placeholder\\right)', category: 'trig' },
  { id: 't7', name: 'sec(x)', latex: '\\sec\\left(\\placeholder\\right)', category: 'trig' },
  { id: 't8', name: 'cosec(x)', latex: '\\csc\\left(\\placeholder\\right)', category: 'trig' },
  { id: 't9', name: 'arcsin(x)', latex: '\\arcsin\\left(\\placeholder\\right)', category: 'trig' },

  // Calculus
  { id: 'c1', name: 'Indefinite Integral', latex: '\\int \\placeholder \\, dx', category: 'calculus' },
  { id: 'c2', name: 'Definite Integral', latex: '\\int_{\\placeholder}^{\\placeholder} \\placeholder \\, dx', category: 'calculus' },
  { id: 'c3', name: 'Double Integral', latex: '\\iint \\placeholder \\, dx \\, dy', category: 'calculus' },
  { id: 'c4', name: 'Derivative', latex: '\\frac{d}{dx}\\left(\\placeholder\\right)', category: 'calculus' },
  { id: 'c5', name: 'Partial Derivative', latex: '\\frac{\\partial}{\\partial \\placeholder}\\left(\\placeholder\\right)', category: 'calculus' },
  { id: 'c6', name: 'Second Derivative', latex: '\\frac{d^2}{dx^2}\\left(\\placeholder\\right)', category: 'calculus' },
  { id: 'c7', name: 'Limit', latex: '\\lim_{\\placeholder \\to \\placeholder} \\placeholder', category: 'calculus' },
  { id: 'c8', name: 'Limit to Infinity', latex: '\\lim_{\\placeholder \\to \\infty} \\placeholder', category: 'calculus' },
  { id: 'c9', name: 'Infinity Integral', latex: '\\int_{\\placeholder}^{\\infty} \\placeholder \\, dx', category: 'calculus' },

  // Sums & Products
  { id: 's1', name: 'Summation', latex: '\\sum_{\\placeholder}^{\\placeholder} \\placeholder', category: 'sums' },
  { id: 's2', name: 'Product', latex: '\\prod_{\\placeholder}^{\\placeholder} \\placeholder', category: 'sums' },
  { id: 's3', name: 'Sum of n Terms', latex: '\\sum_{i=1}^{n} \\placeholder', category: 'sums' },
  { id: 's4', name: 'Sum to Infinity', latex: '\\sum_{i=1}^{\\infty} \\placeholder', category: 'sums' },

  // Matrices
  { id: 'm1', name: '2×2 Matrix', latex: '\\begin{pmatrix} \\placeholder & \\placeholder \\\\ \\placeholder & \\placeholder \\end{pmatrix}', category: 'matrices' },
  { id: 'm2', name: '3×3 Matrix', latex: '\\begin{pmatrix} \\placeholder & \\placeholder & \\placeholder \\\\ \\placeholder & \\placeholder & \\placeholder \\\\ \\placeholder & \\placeholder & \\placeholder \\end{pmatrix}', category: 'matrices' },
  { id: 'm3', name: '2×2 Determinant', latex: '\\begin{vmatrix} \\placeholder & \\placeholder \\\\ \\placeholder & \\placeholder \\end{vmatrix}', category: 'matrices' },
  { id: 'm4', name: 'Column Vector', latex: '\\begin{pmatrix} \\placeholder \\\\ \\placeholder \\end{pmatrix}', category: 'matrices' },
  { id: 'm5', name: 'Row Vector', latex: '\\begin{pmatrix} \\placeholder & \\placeholder & \\placeholder \\end{pmatrix}', category: 'matrices' },

  // Brackets
  { id: 'br1', name: 'Parentheses', latex: '\\left( \\placeholder \\right)', category: 'brackets' },
  { id: 'br2', name: 'Square Brackets', latex: '\\left[ \\placeholder \\right]', category: 'brackets' },
  { id: 'br3', name: 'Curly Braces', latex: '\\left\\{ \\placeholder \\right\\}', category: 'brackets' },
  { id: 'br4', name: 'Angle Brackets', latex: '\\left\\langle \\placeholder \\right\\rangle', category: 'brackets' },
  { id: 'br5', name: 'Floor/Ceiling', latex: '\\left\\lfloor \\placeholder \\right\\rfloor', category: 'brackets' },
  { id: 'br6', name: 'Ceiling', latex: '\\left\\lceil \\placeholder \\right\\rceil', category: 'brackets' },
  { id: 'br7', name: 'Norm', latex: '\\left\\| \\placeholder \\right\\|', category: 'brackets' },
  { id: 'br8', name: 'Absolute Value', latex: '\\left| \\placeholder \\right|', category: 'brackets' },

  // Relations & Logic
  { id: 'l1', name: 'Not Equal', latex: '\\placeholder \\neq \\placeholder', category: 'logic' },
  { id: 'l2', name: 'Less or Equal', latex: '\\placeholder \\leq \\placeholder', category: 'logic' },
  { id: 'l3', name: 'Greater or Equal', latex: '\\placeholder \\geq \\placeholder', category: 'logic' },
  { id: 'l4', name: 'Approximately', latex: '\\placeholder \\approx \\placeholder', category: 'logic' },
  { id: 'l5', name: 'Element Of', latex: '\\placeholder \\in \\placeholder', category: 'logic' },
  { id: 'l6', name: 'Union', latex: '\\placeholder \\cup \\placeholder', category: 'logic' },
  { id: 'l7', name: 'Intersection', latex: '\\placeholder \\cap \\placeholder', category: 'logic' },
  { id: 'l8', name: 'Subset', latex: '\\placeholder \\subseteq \\placeholder', category: 'logic' },
  { id: 'l9', name: 'For All', latex: '\\forall \\placeholder, \\placeholder', category: 'logic' },
  { id: 'l10', name: 'There Exists', latex: '\\exists \\placeholder \\text{ such that } \\placeholder', category: 'logic' },
  { id: 'l11', name: 'Implies', latex: '\\placeholder \\implies \\placeholder', category: 'logic' },
  { id: 'l12', name: 'If and Only If', latex: '\\placeholder \\iff \\placeholder', category: 'logic' },

  // Greek Letters
  { id: 'g1', name: 'alpha', latex: '\\alpha', category: 'greek' },
  { id: 'g2', name: 'beta', latex: '\\beta', category: 'greek' },
  { id: 'g3', name: 'gamma', latex: '\\gamma', category: 'greek' },
  { id: 'g4', name: 'delta', latex: '\\delta', category: 'greek' },
  { id: 'g5', name: 'epsilon', latex: '\\epsilon', category: 'greek' },
  { id: 'g6', name: 'theta', latex: '\\theta', category: 'greek' },
  { id: 'g7', name: 'lambda', latex: '\\lambda', category: 'greek' },
  { id: 'g8', name: 'mu', latex: '\\mu', category: 'greek' },
  { id: 'g9', name: 'pi', latex: '\\pi', category: 'greek' },
  { id: 'g10', name: 'sigma', latex: '\\sigma', category: 'greek' },
  { id: 'g11', name: 'phi', latex: '\\phi', category: 'greek' },
  { id: 'g12', name: 'omega', latex: '\\omega', category: 'greek' },
  { id: 'g13', name: 'Delta (capital)', latex: '\\Delta', category: 'greek' },
  { id: 'g14', name: 'Sigma (capital)', latex: '\\Sigma', category: 'greek' },
  { id: 'g15', name: 'Omega (capital)', latex: '\\Omega', category: 'greek' },
  { id: 'g16', name: 'Theta (capital)', latex: '\\Theta', category: 'greek' },
  { id: 'g17', name: 'Lambda (capital)', latex: '\\Lambda', category: 'greek' },
  { id: 'g18', name: 'Pi (capital)', latex: '\\Pi', category: 'greek' },

  // Arrows
  { id: 'a1', name: 'Right Arrow', latex: '\\rightarrow', category: 'arrows' },
  { id: 'a2', name: 'Left Arrow', latex: '\\leftarrow', category: 'arrows' },
  { id: 'a3', name: 'Double Arrow', latex: '\\leftrightarrow', category: 'arrows' },
  { id: 'a4', name: 'Maps To', latex: '\\mapsto', category: 'arrows' },
  { id: 'a5', name: 'Long Right', latex: '\\longrightarrow', category: 'arrows' },
  { id: 'a6', name: 'Double-headed Right', latex: '\\Rightarrow', category: 'arrows' },
  { id: 'a7', name: 'Double-headed Left', latex: '\\Leftarrow', category: 'arrows' },
  { id: 'a8', name: 'Double-headed Both', latex: '\\Leftrightarrow', category: 'arrows' },

  // Common Equations
  { id: 'ce1', name: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', category: 'common' },
  { id: 'ce2', name: 'Pythagorean Theorem', latex: 'a^2 + b^2 = c^2', category: 'common' },
  { id: 'ce3', name: 'Euler\'s Identity', latex: 'e^{i\\pi} + 1 = 0', category: 'common' },
  { id: 'ce4', name: 'Area of Circle', latex: 'A = \\pi r^2', category: 'common' },
  { id: 'ce5', name: 'Circumference', latex: 'C = 2\\pi r', category: 'common' },
  { id: 'ce6', name: 'Quadratic Equation', latex: 'ax^2 + bx + c = 0', category: 'common' },
  { id: 'ce7', name: 'Distance Formula', latex: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}', category: 'common' },
  { id: 'ce8', name: 'Slope Formula', latex: 'm = \\frac{y_2 - y_1}{x_2 - x_1}', category: 'common' },
  { id: 'ce9', name: 'Point-Slope Form', latex: 'y - y_1 = m(x - x_1)', category: 'common' },
  { id: 'ce10', name: 'Logarithm', latex: '\\log_{\\placeholder}\\left(\\placeholder\\right)', category: 'common' },
  { id: 'ce11', name: 'Natural Log', latex: '\\ln\\left(\\placeholder\\right)', category: 'common' },
  { id: 'ce12', name: 'Exponential', latex: 'e^{\\placeholder}', category: 'common' },
  { id: 'ce13', name: 'Binomial Theorem', latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', category: 'common' },
  { id: 'ce14', name: 'Permutation', latex: 'P(n, r) = \\frac{n!}{(n-r)!}', category: 'common' },
  { id: 'ce15', name: 'Combination', latex: 'C(n, r) = \\frac{n!}{r!(n-r)!}', category: 'common' },
  { id: 'ce16', name: 'Mean', latex: '\\bar{x} = \\frac{\\sum x_i}{n}', category: 'common' },
  { id: 'ce17', name: 'Standard Deviation', latex: '\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}', category: 'common' },
  { id: 'ce18', name: 'Probability', latex: 'P(A) = \\frac{\\text{favorable outcomes}}{\\text{total outcomes}}', category: 'common' },
  { id: 'ce19', name: 'Taylor Series', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n', category: 'common' },
  { id: 'ce20', name: 'Area of Triangle', latex: 'A = \\frac{1}{2}bh', category: 'common' },
];

export function getTemplatesByCategory(categoryId: string): MathTemplate[] {
  return mathTemplates.filter((t) => t.category === categoryId);
}