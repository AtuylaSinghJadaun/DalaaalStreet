'use client'

import PropertiesPanel from '@/components/admin/PropertiesPanel'

export default function PropertiesPage() {
  // Background, padding and the page header are owned by the admin layout +
  // PropertiesPanel, so this page just mounts the panel (no duplicate chrome).
  return <PropertiesPanel />
}
