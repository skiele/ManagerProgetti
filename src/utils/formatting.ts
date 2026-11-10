// Formato euro italiano con separatore delle migliaia sempre presente (7.300,00 €).
// Con le impostazioni predefinite l'italiano non separa i numeri di 4 cifre (7300,00 €),
// e accanto a 13.500 € la colonna risulterebbe disallineata.
const euroFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);

export const formatCurrency = (amount: number): string => euroFormatter.format(amount);
