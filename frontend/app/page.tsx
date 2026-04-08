import BannerSlider from '@/components/BannerSlider'
import Gallery from '@/components/Gallery'
import MenuItems from '@/components/MenuItems'


export default function Home() {
  return (
    <main className="min-h-screen bg-transparent">
      {/* Hero Section - Banner Slider */}
      <BannerSlider />

      {/* Menu Items Section */}
      <MenuItems />

      {/* Gallery Section */}
      <Gallery />

      {/* About Section - Transparent background to show watermark */}
      <section id="about" className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">About Us</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto">
            KN KITCHEN is a professional catering service providing delicious food for all occasions.
            With years of experience and a commitment to quality, we bring excellence to every event.
          </p>
        </div>
      </section>

      {/* Contact Section - Transparent background to show watermark */}
      <section id="contact" className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Contact Us</h2>
          <div className="text-center">
            <p className="text-gray-600 mb-2">📞 Phone: +91 1234567890</p>
            <p className="text-gray-600 mb-2">📧 Email: contact@knkitchen.com</p>
            <p className="text-gray-600">📍 Address: Your Location Here</p>
          </div>
        </div>
      </section>

      {/* Feedback Section - Transparent background to show watermark */}
      <section id="feedback" className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Feedback</h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto">
            We value your feedback! Please share your experience with us to help us improve our services.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-2">&copy; 2026 KN KITCHEN. All rights reserved.</p>
          <p className="text-sm text-gray-400">Professional Catering Management System</p>
        </div>
      </footer>
    </main>
  )
}
