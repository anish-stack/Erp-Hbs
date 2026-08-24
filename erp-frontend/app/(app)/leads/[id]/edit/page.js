'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Protected } from '@/components/shared/protected';
import LeadForm from '@/components/shared/lead-form';

export default function EditLeadPage({ params }) {
  return (
    <Protected permission="lead.update">
      <div className="space-y-6">

        <PageHeader
          title="Edit Lead"
          description="Update prospect information and pipeline details."
          crumbs={[
            { label: 'Sales' },
            { label: 'Leads' },
            { label: 'Edit Lead' },
          ]}
        />

        <LeadForm
          mode="edit"
          leadId={params.id}
        />

      </div>
    </Protected>
  );
}