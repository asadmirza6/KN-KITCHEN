'use client'

/**
 * Breadcrumb Component
 * Shows navigation path (e.g., Admin > ERP > Inventory)
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href: string
}

export default function Breadcrumb() {
  const pathname = usePathname()

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Admin', href: '/admin' }
    ]

    const breadcrumbMap: Record<string, string> = {
      'orders': 'Orders',
      'quotations': 'Quotations',
      'inventory': 'Inventory',
      'vendors': 'Vendors',
      'staff': 'Staff',
      'recipes': 'Recipes',
      'purchase-records': 'Purchase Records',
      'items': 'Menu Items',
      'gallery': 'Gallery',
      'banners': 'Banners',
      'packages': 'Packages',
      'users': 'Users',
    }

    const sectionMap: Record<string, string> = {
      'orders': 'Operations',
      'quotations': 'Operations',
      'inventory': 'ERP Management',
      'vendors': 'ERP Management',
      'staff': 'ERP Management',
      'recipes': 'ERP Management',
      'purchase-records': 'ERP Management',
      'items': 'Content Management',
      'gallery': 'Content Management',
      'banners': 'Content Management',
      'packages': 'Content Management',
      'users': 'Settings',
    }

    if (segments.length > 1) {
      const page = segments[1]
      const section = sectionMap[page]

      if (section && section !== 'Operations') {
        breadcrumbs.push({ label: section, href: '#' })
      }

      if (breadcrumbMap[page]) {
        breadcrumbs.push({ label: breadcrumbMap[page], href: pathname })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
      {breadcrumbs.map((crumb, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {idx > 0 && <span className="text-gray-400">/</span>}
          {idx === breadcrumbs.length - 1 ? (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-indigo-600 hover:text-indigo-700">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
