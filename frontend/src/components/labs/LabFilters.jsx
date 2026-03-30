import React from 'react'
import { Search, Snowflake, Wind, ArrowUpDown } from 'lucide-react'

const LabFilters = ({ filters, setFilters }) => {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 mb-8 shadow-lg">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal" size={18} />
          <input
            type="text"
            placeholder="Search labs by name or owner..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all"
          />
        </div>

        {/* AC Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilters({ ...filters, ac: 'all' })}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filters.ac === 'all'
                ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                : 'bg-teal/10 text-ocean hover:bg-teal/20'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilters({ ...filters, ac: 'ac' })}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filters.ac === 'ac'
                ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                : 'bg-teal/10 text-ocean hover:bg-teal/20'
            }`}
          >
            <Snowflake size={16} />
            AC
          </button>
          <button
            onClick={() => setFilters({ ...filters, ac: 'non-ac' })}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filters.ac === 'non-ac'
                ? 'bg-gradient-to-r from-teal to-teal-light text-white shadow-lg'
                : 'bg-teal/10 text-ocean hover:bg-teal/20'
            }`}
          >
            <Wind size={16} />
            Non-AC
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} className="text-gray-500" />
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-4 py-2 rounded-xl border-2 border-teal/20 focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10 transition-all bg-white text-ocean font-medium"
          >
            <option value="name">Sort by Name</option>
            <option value="capacity">Sort by Capacity</option>
            <option value="building">Sort by Building</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default LabFilters