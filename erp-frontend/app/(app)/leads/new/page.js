'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import LeadForm from '@/components/shared/lead-form';

export default function NewLeadPage() {
  return (
    <Protected permission="lead.create">
      <div className="space-y-6">

        <PageHeader
          title="Create Lead"
          description="Add a new prospect to your CRM pipeline."
          crumbs={[
            { label: 'Sales' },
            { label: 'Leads' },
            { label: 'New Lead' },
          ]}
        />

        <LeadForm mode="create" />

      </div>
    </Protected>
  );
}