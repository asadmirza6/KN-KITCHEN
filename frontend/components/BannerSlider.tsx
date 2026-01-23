'use client'

/**
 * Auto-rotating banner slider component.
 * Displays active banners from the backend with 5-second rotation.
 */

import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { fetchBanners } from '@/services/mediaService'
import type { MediaAsset } from '@/types/MediaAsset'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/pagination'


// Local fallback banners
const LOCAL_BANNERS = [
  { id: -1, image_url: '/images/banner1.jpeg', title: 'Welcome to KN KITCHEN' },
  { id: -2, image_url: '/images/banner2.jpeg', title: 'Quality Catering Services' },
  { id: -3, image_url: '/images/banner3.jpeg', title: 'Professional Event Catering' },
]

export default function BannerSlider() {
  const [banners, setBanners] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      const data = await fetchBanners()
      // If no banners from database, use local fallback
      if (data && data.length > 0) {
        setBanners(data)
      } else {
        setBanners(LOCAL_BANNERS as any)
      }
    } catch (err: any) {
      console.error('Failed to load banners:', err)
      // Use local banners as fallback on error
      setBanners(LOCAL_BANNERS as any)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-200 animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading banners...</p>
      </div>
    )
  }

  if (error || banners.length === 0) {
    return (
      <div className="w-full h-96 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-2">Welcome to KN KITCHEN</h2>
          <p className="text-xl">Professional Catering Services</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        loop={banners.length > 1}
        className="h-96"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className="relative w-full h-96">
              <img
                src={banner.image_url.startsWith('/images/')
                  ? banner.image_url
                  : `${process.env.NEXT_PUBLIC_API_URL}${banner.image_url}`
                }
                alt={banner.title || 'Banner'}
                className="w-full h-full object-cover"
              />
              {banner.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                  <h3 className="text-2xl font-bold">{banner.title}</h3>
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
