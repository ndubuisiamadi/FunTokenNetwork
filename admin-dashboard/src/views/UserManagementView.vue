<template>
  <div class="min-h-screen bg-gray-900 p-4 lg:p-6 overflow-x-hidden">
    <div class="max-w-full mx-auto space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl lg:text-3xl font-bold text-white">User Management</h1>
          <p class="text-gray-400 mt-1">Manage users, roles, and permissions</p>
        </div>
      </div>

      <!-- User Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <!-- Total Users Card -->
  <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-gray-400 text-sm font-medium">Total Users</p>
        
        <!-- Loading State -->
        <div v-if="statsLoading" class="animate-pulse">
          <div class="h-8 bg-gray-600 rounded w-20 mt-2"></div>
          <div class="h-4 bg-gray-600 rounded w-16 mt-2"></div>
        </div>
        
        <!-- Error State -->
        <div v-else-if="statsError" class="mt-2">
          <p class="text-2xl font-bold text-red-400">Error</p>
          <p class="text-red-300 text-sm">Failed to load</p>
        </div>
        
        <!-- Normal State -->
        <div v-else>
          <p class="text-2xl font-bold text-white mt-2">{{ formatNumber(userStats.total) }}</p>
          <div class="flex items-center mt-2 text-sm">
            <svg class="w-4 h-4 mr-1" :class="[userStats.growth >= 0 ? 'text-green-400' : 'text-red-400']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="userStats.growth >= 0 ? 'M7 17l9.2-9.2M17 17V7m0 10h-10' : 'M17 7l-9.2 9.2M7 7v10m0-10h10'"/>
            </svg>
            <span :class="userStats.growth >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ Math.abs(userStats.growth) }}% this week
            </span>
          </div>
        </div>
      </div>
      
      <div class="p-3 bg-blue-600/20 rounded-lg">
        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- Active Users Card -->
  <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-gray-400 text-sm font-medium">Active Users (24h)</p>
        
        <!-- Loading State -->
        <div v-if="statsLoading" class="animate-pulse">
          <div class="h-8 bg-gray-600 rounded w-16 mt-2"></div>
          <div class="h-4 bg-gray-600 rounded w-20 mt-2"></div>
        </div>
        
        <!-- Error State -->
        <div v-else-if="statsError" class="mt-2">
          <p class="text-2xl font-bold text-red-400">Error</p>
          <p class="text-red-300 text-sm">Failed to load</p>
        </div>
        
        <!-- Normal State -->
        <div v-else>
          <p class="text-2xl font-bold text-green-400 mt-2">{{ formatNumber(userStats.active24h) }}</p>
          <p class="text-green-300 text-sm mt-2">{{ userStats.activePercentage }}% of total</p>
        </div>
      </div>
      
      <div class="p-3 bg-green-600/20 rounded-lg">
        <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- New Users Card -->
  <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-gray-400 text-sm font-medium">New Users (7d)</p>
        
        <!-- Loading State -->
        <div v-if="statsLoading" class="animate-pulse">
          <div class="h-8 bg-gray-600 rounded w-12 mt-2"></div>
          <div class="h-4 bg-gray-600 rounded w-18 mt-2"></div>
        </div>
        
        <!-- Error State -->
        <div v-else-if="statsError" class="mt-2">
          <p class="text-2xl font-bold text-red-400">Error</p>
          <p class="text-red-300 text-sm">Failed to load</p>
        </div>
        
        <!-- Normal State -->
        <div v-else>
          <p class="text-2xl font-bold text-purple-400 mt-2">{{ formatNumber(userStats.new7d) }}</p>
          <p class="text-purple-300 text-sm mt-2">{{ userStats.avgDaily }} avg/day</p>
        </div>
      </div>
      
      <div class="p-3 bg-purple-600/20 rounded-lg">
        <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- Problem Users Card (Unverified/Suspended) -->
<div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-gray-400 text-sm font-medium">Unverified Users</p>
      
      
      <!-- Loading State -->
      <div v-if="statsLoading" class="animate-pulse">
        <div class="h-8 bg-gray-600 rounded w-10 mt-2"></div>
        <div class="h-4 bg-gray-600 rounded w-16 mt-2"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="statsError" class="mt-2">
        <p class="text-2xl font-bold text-red-400">Error</p>
        <p class="text-red-300 text-sm">Failed to load</p>
      </div>
      
      <!-- Normal State -->
      <div v-else>
        <p class="text-2xl font-bold text-yellow-400 mt-2">{{ formatNumber(userStats.suspended) }}</p>
        <p class="text-yellow-300 text-sm mt-2">{{ userStats.suspendedPercentage }}% of total</p>
      </div>
    </div>
    
    <div class="p-3 bg-yellow-600/20 rounded-lg">
      <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
      </svg>
    </div>
  </div>
</div>

</div>

      <!-- Error Message for Stats -->
<div v-if="statsError && !statsLoading" class="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
  <div class="flex items-center">
    <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <p class="text-red-400 text-sm">{{ statsError }}</p>
    <button 
      @click="loadUserStats" 
      class="ml-auto px-3 py-1 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 transition-colors"
    >
      Retry
    </button>
  </div>
</div>

      <!-- Filters and Search - Make responsive -->
      <div class="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700 overflow-x-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 min-w-fit">
          <!-- Search -->
          <div class="sm:col-span-2 lg:col-span-2 min-w-[200px]">
            <label class="block text-sm font-medium text-gray-300 mb-2">Search Users</label>
            <div class="relative">
              <input
                v-model="filters.search"
                type="text"
                placeholder="Search by name, email, username..."
                class="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Role Filter -->
          <div class="min-w-[120px]">
            <label class="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select 
              v-model="filters.role"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-xs rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="min-w-[120px]">
            <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select 
              v-model="filters.status"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Unverified</option>
            </select>
          </div>

          <!-- Level Filter -->
          <div class="min-w-[120px]">
            <label class="block text-sm font-medium text-gray-300 mb-2">Level</label>
            <input
              v-model="filters.level"
              type="text"
              placeholder="Level..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-2 sm:col-span-2 lg:col-span-1 lg:items-end">
            <button
              @click="applyFilters"
              class="px-4 py-2 bg-blue-600 text-xs text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"/>
              </svg>
              Apply
            </button>
            <button
              @click="clearFilters"
              class="px-4 py-2 bg-gray-600 text-xs text-white rounded-lg hover:bg-gray-500 transition-colors flex items-center justify-center whitespace-nowrap"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Users Table - Use the responsive table from the previous artifact -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
  <!-- Table Header with Refresh Button -->
  <div class="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
    <h3 class="text-lg font-medium text-white">Users ({{ formatNumber(pagination.total) }})</h3>
    <button
      @click="refreshUsers"
      :disabled="loading"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
    >
      <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      {{ loading ? 'Loading...' : 'Refresh' }}
    </button>
  </div>

  <!-- Responsive Table Container with Horizontal Scroll -->
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-700">
      <!-- Table Headers - Optimized for smaller screens -->
      <thead class="bg-gray-700">
        <tr>
          <!-- User Info - Always visible -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
            User
          </th>
          
          <!-- Email - Hide on mobile -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
            Email
          </th>
          
          <!-- Role -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
            Role
          </th>
          
          <!-- Status -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
            Status
          </th>
          
          <!-- Level - Hide on small screens -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
            Level
          </th>
          
          <!-- Total Earnings -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap">
            <div class="flex items-center">
              <svg class="w-3 h-3 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span class="hidden lg:inline">Total</span>
            </div>
          </th>
          
          <!-- Referral Earnings - Hide on small screens -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
            <div class="flex items-center">
              <svg class="w-3 h-3 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857"/>
              </svg>
              Refs
            </div>
          </th>
          
          <!-- Task Earnings - Hide on small screens -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
            <div class="flex items-center">
              <svg class="w-3 h-3 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              </svg>
              Tasks
            </div>
          </th>
          
          <!-- Join Date - Hide on mobile -->
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
            Joined
          </th>
          
          <!-- Actions - Always visible but smaller -->
          <th scope="col" class="relative px-2 py-3">
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>

      <!-- Table Body with Responsive Cells -->
      <tbody class="divide-y divide-gray-700">
        <!-- Loading State -->
        <tr v-if="loading" v-for="i in 5" :key="`loading-${i}`" class="animate-pulse">
          <td class="px-4 py-4"><div class="h-4 bg-gray-600 rounded w-24"></div></td>
          <td class="px-4 py-4 hidden sm:table-cell"><div class="h-4 bg-gray-600 rounded w-32"></div></td>
          <td class="px-4 py-4"><div class="h-4 bg-gray-600 rounded w-16"></div></td>
          <td class="px-4 py-4"><div class="h-4 bg-gray-600 rounded w-20"></div></td>
          <td class="px-4 py-4 hidden md:table-cell"><div class="h-4 bg-gray-600 rounded w-16"></div></td>
          <td class="px-4 py-4"><div class="h-4 bg-gray-600 rounded w-16"></div></td>
          <td class="px-4 py-4 hidden lg:table-cell"><div class="h-4 bg-gray-600 rounded w-12"></div></td>
          <td class="px-4 py-4 hidden lg:table-cell"><div class="h-4 bg-gray-600 rounded w-12"></div></td>
          <td class="px-4 py-4 hidden md:table-cell"><div class="h-4 bg-gray-600 rounded w-20"></div></td>
          <td class="px-2 py-4"><div class="h-4 bg-gray-600 rounded w-8"></div></td>
        </tr>
        
        <!-- No Users State -->
        <tr v-else-if="!hasUsers" class="text-center">
          <td colspan="10" class="px-4 py-12 text-gray-400">
            <div class="flex flex-col items-center">
              <svg class="w-12 h-12 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V9M18 13h2m-6 0h2"/>
              </svg>
              <p class="text-lg font-medium">No users found</p>
              <p class="text-sm">Try adjusting your search filters</p>
            </div>
          </td>
        </tr>
        
        <!-- User Rows -->
        <tr v-else v-for="user in users" :key="user.id" class="hover:bg-gray-700/50 transition-colors">
          <!-- User Info - Compact on mobile -->
          <td class="px-4 py-4">
            <div class="flex items-center min-w-0">
              <div class="size-6 lg:size-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs lg:text-sm flex-shrink-0">
                {{ user.username.charAt(0).toUpperCase() }}
              </div>
              <div class="ml-2 lg:ml-3 min-w-0 flex-1">
                <div class="text-xs font-medium text-white truncate">{{ user.username }}</div>
                <div class="text-xs text-gray-400 truncate sm:hidden">{{ user.email || 'No email' }}</div>
                <div class="text-xs text-gray-400 truncate ">{{ user.firstName }} {{ user.lastName }}</div>
              </div>
            </div>
          </td>

          <!-- Email - Hidden on mobile -->
          <td class="px-4 py-4 hidden sm:table-cell">
            <div class="text-xs text-gray-300 truncate max-w-[200px]">{{ user.email || 'No email' }}</div>
          </td>

          <!-- Role -->
          <td class="px-4 py-4">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" :class="getRoleBadge(user.role)">
              {{ user.role.replace('_', ' ').charAt(0).toUpperCase() + user.role.replace('_', ' ').slice(1) }}
            </span>
          </td>

          <!-- Status -->
          <td class="px-4 py-4">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" :class="getStatusBadge(user)">
              {{ getUserStatus(user) }}
            </span>
          </td>

          <!-- Level - Hidden on small screens -->
          <td class="px-4 py-4 hidden md:table-cell">
            <div class="text-xs text-gray-300 whitespace-nowrap">{{ user.level }}</div>
          </td>

          <!-- Total Earnings -->
          <td class="px-4 py-4">
            <div class="text-sm font-medium text-yellow-400 whitespace-nowrap">
              {{ formatNumber(user.stats?.totalEarnings || user.gumballs) }}
            </div>
            <div v-if="user.stats?.earningsDiscrepancy" class="text-xs text-orange-400 whitespace-nowrap" title="Stored vs calculated earnings mismatch">
              ({{ formatNumber(user.gumballs) }})
            </div>
          </td>

          <!-- Referral Earnings - Hidden on small screens -->
          <td class="px-4 py-4 hidden lg:table-cell">
            <div class="text-sm text-green-400 whitespace-nowrap">
              {{ formatNumber(user.stats?.referralEarnings || 0) }}
            </div>
          </td>

          <!-- Task Earnings - Hidden on small screens -->
          <td class="px-4 py-4 hidden lg:table-cell">
            <div class="text-sm text-blue-400 whitespace-nowrap">
              {{ formatNumber(user.stats?.taskEarnings || 0) }}
            </div>
          </td>

          <!-- Join Date - Hidden on mobile -->
          <td class="px-4 py-4 hidden md:table-cell">
            <div class="text-xs text-gray-300 whitespace-nowrap">{{ formatDate(user.createdAt) }}</div>
            <div class="text-xs text-gray-400 whitespace-nowrap">{{ formatTimeAgo(user.lastSeen) }}</div>
          </td>

          <!-- Actions - Compact -->
          <td class="px-2 py-4 text-right">
            <div class="flex items-center justify-end space-x-1">
              <!-- View Button -->
              <button
                @click="viewUser(user)"
                class="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                title="View Details"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
              
              <!-- More Actions Dropdown - Show on hover -->
              <div class="relative group">
                <button class="p-1 text-gray-400 hover:text-gray-300 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div class="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div class="py-1">
                    <button
                      @click="editUser(user)"
                      class="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-700 flex items-center"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      Edit User
                    </button>
                    
                    <button
                      v-if="getUserStatus(user) !== 'SUSPENDED'"
                      @click="suspendUser(user)"
                      class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"/>
                      </svg>
                      Suspend
                    </button>
                    
                    <button
                      v-else
                      @click="unsuspendUser(user)"
                      class="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-gray-700 flex items-center"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Unsuspend
                    </button>
                    
                    <hr class="border-gray-600 my-1">
                    
                    <button
                      @click="deleteUser(user)"
                      class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

      <!-- Pagination - Make responsive -->
      <div v-if="showPagination" class="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-sm text-gray-400 order-2 sm:order-1">
            Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of 
            {{ formatNumber(pagination.total) }} users
          </div>
          
          <div class="flex items-center space-x-2 order-1 sm:order-2">
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <!-- Page Numbers - Show fewer on mobile -->
            <div class="hidden sm:flex items-center space-x-1">
              <button
                v-for="page in Math.min(5, pagination.totalPages)"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'px-3 py-2 rounded-lg transition-colors',
                  page === pagination.page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                ]"
              >
                {{ page }}
              </button>
            </div>
            
            <!-- Mobile: Just show current page -->
            <div class="sm:hidden px-3 py-2 bg-gray-700 text-white rounded-lg">
              {{ pagination.page }} / {{ pagination.totalPages }}
            </div>
            
            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminAPI } from '@/services/api'

// Component state
const loading = ref(false)
const statsLoading = ref(false)
const users = ref([])
const userStats = ref({
  total: 0,
  growth: 0,
  active24h: 0,
  activePercentage: 0,
  new7d: 0,
  avgDaily: 0,
  suspended: 0,
  suspendedPercentage: 0,
  unverified: 0
})

// Error states
const error = ref(null)
const statsError = ref(null)

// Filters
const filters = ref({
  search: '',
  role: '',
  status: '',
  level: ''
})

// Pagination
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

// Computed properties
const hasUsers = computed(() => users.value.length > 0)
const showPagination = computed(() => pagination.value.totalPages > 1)

// Methods
const formatNumber = (num) => {
  if (!num || num === 0) return '0'
  return new Intl.NumberFormat().format(num)
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never'
  
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 7) return formatDate(timestamp)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const getRoleBadge = (role) => {
  const badges = {
    user: 'bg-gray-900/20 text-gray-400 border border-gray-500/30',
    admin: 'bg-blue-900/20 text-blue-400 border border-blue-500/30',
    super_admin: 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
  }
  return badges[role] || badges.user
}

const getUserStatus = (user) => {
  // Since isSuspended doesn't exist, we use isEmailVerified as proxy
  if (!user.isEmailVerified && user.createdAt && isOldAccount(user.createdAt)) {
    return 'SUSPENDED' // Old account that's unverified = likely suspended
  }
  if (!user.isEmailVerified) return 'UNVERIFIED'
  return 'ACTIVE'
}

const getStatusBadge = (user) => {
  const status = getUserStatus(user)
  if (status === 'SUSPENDED') return 'bg-red-900/20 text-red-400 border border-red-500/30'
  if (status === 'UNVERIFIED') return 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30'
  return 'bg-green-900/20 text-green-400 border border-green-500/30'
}

// Helper function to determine if account is old enough to be considered suspended vs just unverified
const isOldAccount = (createdAt) => {
  const accountAge = Date.now() - new Date(createdAt).getTime()
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000
  return accountAge > threeDaysInMs // If account is older than 3 days and still unverified
}

// Updated suspend/unsuspend methods to work with current schema
const suspendUser = async (user) => {
  const reason = prompt('Enter suspension reason:')
  if (!reason) return
  
  try {
    await adminAPI.suspendUser(user.id, { reason })
    // Update local state - the backend sets isEmailVerified to false
    user.isEmailVerified = false
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success(`User ${user.username} suspended successfully`)
    }
    
    // Refresh stats after suspension
    loadUserStats()
    
  } catch (error) {
    console.error('Failed to suspend user:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to suspend user')
    }
  }
}

const unsuspendUser = async (user) => {
  try {
    await adminAPI.unsuspendUser(user.id)
    // Update local state - the backend sets isEmailVerified to true
    user.isEmailVerified = true
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success(`User ${user.username} unsuspended successfully`)
    }
    
    // Refresh stats after unsuspension
    loadUserStats()
    
  } catch (error) {
    console.error('Failed to unsuspend user:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to unsuspend user')
    }
  }
}

// 🚀 ENHANCED: Load users with better error handling
const loadUsers = async () => {
  if (loading.value) return // Prevent concurrent requests
  
  loading.value = true
  error.value = null
  
  try {
    console.log('👥 Loading users with filters:', filters.value)
    
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    }
    
    const response = await adminAPI.getAllUsers(params)
    
    if (response.data) {
      users.value = response.data.users || []
      pagination.value = response.data.pagination || pagination.value
      
      console.log(`✅ Loaded ${users.value.length} users`)
    } else {
      throw new Error('Invalid response structure')
    }
    
  } catch (err) {
    console.error('❌ Failed to load users:', err)
    error.value = 'Failed to load users. Please try again.'
    
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to load users')
    }
  } finally {
    loading.value = false
  }
}

// 🚀 ENHANCED: Load user stats with real API
const loadUserStats = async () => {
  if (statsLoading.value) return // Prevent concurrent requests
  
  statsLoading.value = true
  statsError.value = null
  
  try {
    console.log('📊 Loading live user statistics...')
    
    const response = await adminAPI.getUserStats()
    
    if (response.data && response.data.success) {
      userStats.value = {
        total: response.data.stats.total || 0,
        growth: response.data.stats.growth || 0,
        active24h: response.data.stats.active24h || 0,
        activePercentage: response.data.stats.activePercentage || 0,
        new7d: response.data.stats.new7d || 0,
        avgDaily: response.data.stats.avgDaily || 0,
        suspended: response.data.stats.suspended || 0,
        suspendedPercentage: response.data.stats.suspendedPercentage || 0,
        unverified: response.data.stats.unverified || 0
      }
      
      console.log('✅ User stats loaded successfully:', userStats.value)
    } else {
      throw new Error('Invalid response structure')
    }
    
  } catch (err) {
    console.error('❌ Failed to load user stats:', err)
    statsError.value = 'Failed to load user statistics'
    
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to load user statistics')
    }
    
    // Fallback to basic stats
    userStats.value = {
      total: users.value.length || 0,
      growth: 0,
      active24h: 0,
      activePercentage: 0,
      new7d: 0,
      avgDaily: 0,
      suspended: 0,
      suspendedPercentage: 0,
      unverified: 0
    }
  } finally {
    statsLoading.value = false
  }
}

// Filter and pagination methods
const applyFilters = () => {
  pagination.value.page = 1
  loadUsers()
}

const clearFilters = () => {
  filters.value = {
    search: '',
    role: '',
    status: '',
    level: ''
  }
  pagination.value.page = 1
  loadUsers()
}

const goToPage = (page) => {
  pagination.value.page = page
  loadUsers()
}

// 🚀 ENHANCED: Refresh with loading states
const refreshUsers = async () => {
  console.log('🔄 Refreshing users and stats...')
  await Promise.all([
    loadUsers(),
    loadUserStats()
  ])
}

// User action methods (enhanced with better error handling)
const viewUser = (user) => {
  console.log('👁️ View user:', user.username)
  // TODO: Implement user detail modal
}

const editUser = (user) => {
  console.log('✏️ Edit user:', user.username)
  // TODO: Implement user edit modal
}

const deleteUser = async (user) => {
  if (!confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`)) {
    return
  }
  
  try {
    await adminAPI.deleteUser(user.id)
    
    // Remove user from local array
    const index = users.value.findIndex(u => u.id === user.id)
    if (index > -1) {
      users.value.splice(index, 1)
    }
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success(`User ${user.username} deleted successfully`)
    }
    
    // Refresh stats after deletion
    loadUserStats()
    
  } catch (error) {
    console.error('Failed to delete user:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to delete user')
    }
  }
}

// Initialize component
onMounted(async () => {
  console.log('🚀 UserManagementView mounted')
  await refreshUsers()
})
</script>


<style scoped>
/* Prevent horizontal overflow on the main application */
.admin-layout {
  overflow-x: hidden;
  min-height: 100vh;
  width: 100%;
}

/* Ensure tables are responsive */
.responsive-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}

.responsive-table-container::-webkit-scrollbar {
  height: 6px;
}

.responsive-table-container::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 3px;
}

.responsive-table-container::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 3px;
}

.responsive-table-container::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* Prevent text overflow in table cells */
.table-cell-content {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Ensure proper spacing on small screens */
@media (max-width: 640px) {
  .mobile-compact {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Fix for dropdown positioning */
.dropdown-menu {
  position: absolute;
  z-index: 50;
  min-width: max-content;
}

/* Prevent button text from wrapping */
.action-button {
  white-space: nowrap;
  min-width: max-content;
}

/* Custom scrollbar */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Table hover effects */
tbody tr:hover {
  background-color: rgba(55, 65, 81, 0.3);
}

/* Button animations */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* Progress bar animation */
.bg-blue-500 {
  transition: width 0.3s ease;
}

/* Loading animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>