export default function Dashboard() {
  return (
    <div className="max-w-2xl mx-auto py-20 px-6 text-center">
      <h1 className="text-4xl font-bold mb-3">Content Creation Engine</h1>
      <p className="text-gray-500 mb-10 text-lg">
        Generate brand-consistent marketing content across every format — in seconds.
      </p>
      <div className="flex gap-4 justify-center">
        <a href="/content"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          New Content
        </a>
        <a href="/brands"
          className="border px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Manage Brands
        </a>
      </div>
    </div>
  )
}
