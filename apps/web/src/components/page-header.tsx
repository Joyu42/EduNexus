import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  tags?: string[];
  actions?: ReactNode;
};

export function PageHeader({ title, description, tags = [], actions }: PageHeaderProps) {
  return (
    <header className="page-head page-head-unified">
      <div className="page-head-main">
        <h2>{title}</h2>
        <p>{description}</p>
        {tags.length > 0 ? (
          <div className="page-head-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </header>
  );
}

