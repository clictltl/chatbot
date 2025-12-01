import type { Variable } from '../types/chatbot';

export function interpolateText(text: string, variables: Record<string, Variable>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const variable = variables[varName];
    if (variable && variable.value !== null) {
      return String(variable.value);
    }
    return match;
  });
}

export function evaluateCondition(
  variableName: string,
  operator: string,
  value: string | number,
  variables: Record<string, Variable>
): boolean {
  const variable = variables[variableName.trim()];
  if (!variable || variable.value === null) return false;

  const varValue = variable.type === "number" ? Number(variable.value) : variable.value;
  const compareValue = variable.type === "number" ? Number(value) : value;

  switch (operator) {
    case "==":
      // Para strings, faz comparação case-insensitive
      if (typeof varValue === 'string' && typeof compareValue === 'string') {
        return varValue.trim().toLowerCase() === compareValue.trim().toLowerCase();
      }
      return varValue === compareValue;
    case "!=":
      // Para strings, faz comparação case-insensitive
      if (typeof varValue === 'string' && typeof compareValue === 'string') {
        return varValue.trim().toLowerCase() !== compareValue.trim().toLowerCase();
      }
      return varValue !== compareValue;
    case ">":
      return varValue > compareValue;
    case "<":
      return varValue < compareValue;
    case ">=":
      return varValue >= compareValue;
    case "<=":
      return varValue <= compareValue;
    default:
      return false;
  }
}
