'use client'

/**
 * Admin Sidebar Component
 * Organized navigation with collapsible sections for Operations and ERP Management
 */

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  label: string
  href: string
  icon: string
  active?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
  collapsible?: boolean
}

interface AdminSidebarProps {
  onClose?: () => void
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operations: true,
    erp: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const sections: NavSection[] = [
    {
      title: 'OPERATIONS',
      collapsible: false,
      items: [
        { label: 'Dashboard', href: '/admin', icon: '📊' },
        { label: 'Orders', href: '/admin/orders', icon: '📋' },
        { label: 'Quotations', href: '/admin/quotations', icon: '📄' },
      ]
    },
    {
      title: 'ERP MANAGEMENT',
      collapsible: true,
      items: [
        { label: 'Inventory', href: '/admin/inventory', icon: '📦' },
        { label: 'Vendors', href: '/admin/vendors', icon: '🏢' },
        { label: 'Staff', href: '/admin/staff', icon: '👥' },
        { label: 'Recipes', href: '/admin/recipes', icon: '🍳' },
        { label: 'Purchase Records', href: '/admin/purchase-records', icon: '📝' },
      ]
    },
    {
      title: 'CONTENT MANAGEMENT',
      collapsible: true,
      items: [
        { label: 'Menu Items', href: '/admin/items', icon: '🍽️' },
        { label: 'Gallery', href: '/admin/gallery', icon: '🖼️' },
        { label: 'Banners', href: '/admin/banners', icon: '🎨' },
        { label: 'Packages', href: '/admin/packages', icon: '🎁' },
      ]
    },
    {
      title: 'SETTINGS',
      collapsible: true,
      items: [
        { label: 'Users', href: '/admin/users', icon: '⚙️' },
      ]
    }
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const handleNavClick = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto fixed left-0 top-0 pt-20">
      <nav className="p-4 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
              {section.collapsible && (
                <button
                  onClick={() => toggleSection(section.title.toLowerCase().replace(' ', ''))}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {expandedSections[section.title.toLowerCase().replace(' ', '')] ? '−' : '+'}
                </button>
              )}
            </div>

            {expandedSections[section.title.toLowerCase().replace(' ', '')] !== false && (
              <div className="space-y-1 mt-2">
                {section.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
