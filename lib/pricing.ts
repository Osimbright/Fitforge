/** FitForge Pro list prices (USD). Pro isn't sold yet: these are shown on the landing page only. */
export const PRO_PRICE = { monthly: 9.99, yearly: 79 } as const;

export const PRO_YEARLY_SAVING = Math.round((1 - PRO_PRICE.yearly / (PRO_PRICE.monthly * 12)) * 100);
