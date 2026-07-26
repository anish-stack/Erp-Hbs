import Link from 'next/link';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

/*
  Consistent page masthead: breadcrumb trail, title, optional description, and a
  slot for primary actions. `crumbs` is [{ label, href? }] with the last item
  rendered as the current page.
*/
export function PageHeader({ title, description, crumbs = [], actions }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      {crumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <BreadcrumbItem key={i}>
                  {isLast || !c.href ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink asChild><Link href={c.href}>{c.label}</Link></BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
