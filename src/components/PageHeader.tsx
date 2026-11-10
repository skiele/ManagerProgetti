import React from 'react';

// Intestazione di pagina "grafico svizzero": sopratitolo maiuscolo, titolo grande, filetto spesso.
interface PageHeaderProps {
  overline?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ overline, title, subtitle, actions }) => (
  <header className="flex flex-wrap items-end justify-between gap-4 pb-3.5 mb-8 border-b-4 border-foreground">
    <div className="min-w-0">
      {overline && <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{overline}</p>}
      <h1 className="mt-2 text-4xl md:text-[56px] font-extrabold tracking-[-0.04em] leading-[0.95] break-words">{title}</h1>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
