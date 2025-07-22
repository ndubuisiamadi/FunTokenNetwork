<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white">Content Moderation</h1>
        <p class="text-gray-400 mt-1">Review and moderate user-generated content</p>
      </div>
      <div class="flex items-center space-x-3">
        <!-- Queue Filter -->
        <select 
          v-model="activeQueue"
          @change="switchQueue"
          class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pending Review</option>
          <option value="reports">User Reports</option>
          <option value="flagged">Auto-Flagged</option>
          <option value="reviewed">Recently Reviewed</option>
        </select>
        
        <!-- Auto-moderation Toggle -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-400">Auto-mod:</span>
          <button
            @click="toggleAutoModeration"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              autoModerationEnabled ? 'bg-green-600' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                autoModerationEnabled ? 'translate-x-5' : 'translate-x-0'
              ]"
            />
          </button>
        </div>
        
        <!-- Refresh -->
        <button
          @click="refreshContent"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg 
            :class="['w-4 h-4', loading ? 'animate-spin' : '']" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Moderation Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-yellow-300 text-sm font-medium">Pending Review</p>
            <p class="text-2xl font-bold text-white mt-2">{{ stats.pending }}</p>
            <p class="text-yellow-400 text-sm mt-1">{{ stats.avgWaitTime }} avg wait</p>
          </div>
          <div class="p-3 bg-yellow-600/20 rounded-lg">
            <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-red-600/10 border border-red-500/30 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-red-300 text-sm font-medium">Reported Content</p>
            <p class="text-2xl font-bold text-white mt-2">{{ stats.reported }}</p>
            <p class="text-red-400 text-sm mt-1">{{ stats.highPriority }} high priority</p>
          </div>
          <div class="p-3 bg-red-600/20 rounded-lg">
            <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-green-600/10 border border-green-500/30 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-300 text-sm font-medium">Approved Today</p>
            <p class="text-2xl font-bold text-white mt-2">{{ stats.approvedToday }}</p>
            <p class="text-green-400 text-sm mt-1">{{ stats.approvalRate }}% approval rate</p>
          </div>
          <div class="p-3 bg-green-600/20 rounded-lg">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-blue-600/10 border border-blue-500/30 rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-300 text-sm font-medium">Auto-Moderated</p>
            <p class="text-2xl font-bold text-white mt-2">{{ stats.autoModerated }}</p>
            <p class="text-blue-400 text-sm mt-1">{{ stats.accuracy }}% accuracy</p>
          </div>
          <div class="p-3 bg-blue-600/20 rounded-lg">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div class="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-400">Bulk Actions:</span>
        <button
          @click="bulkApprove"
          :disabled="selectedItems.length === 0"
          class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 text-white text-sm rounded transition-colors"
        >
          Approve Selected ({{ selectedItems.length }})
        </button>
        <button
          @click="bulkReject"
          :disabled="selectedItems.length === 0"
          class="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400 text-white text-sm rounded transition-colors"
        >
          Reject Selected ({{ selectedItems.length }})
        </button>
      </div>
      
      <div class="flex items-center space-x-4 text-sm text-gray-400">
        <span>{{ contentItems.length }} items in queue</span>
        <div v-if="loading" class="flex items-center space-x-2">
          <div class="animate-spin w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full"></div>
          <span>Loading...</span>
        </div>
      </div>
    </div>

    <!-- Content Review Interface -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Content Queue -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Empty State -->
        <div v-if="contentItems.length === 0 && !loading" class="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <h3 class="text-lg font-medium text-white mb-2">All Caught Up!</h3>
          <p class="text-gray-400">No content pending moderation in this queue.</p>
        </div>

        <!-- Content Items -->
        <div
          v-for="item in contentItems"
          :key="item.id"
          :class="[
            'bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all duration-200',
            selectedItems.includes(item.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-600'
          ]"
        >
          <!-- Item Header -->
          <div class="p-4 border-b border-gray-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <!-- Selection Checkbox -->
                <input
                  type="checkbox"
                  :checked="selectedItems.includes(item.id)"
                  @change="toggleSelection(item.id)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"
                />
                
                <!-- User Info -->
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-white font-medium text-sm">{{ item.author.username }}</p>
                    <p class="text-gray-400 text-xs">{{ formatTimeAgo(item.createdAt) }}</p>
                  </div>
                </div>

                <!-- Content Type -->
                <span :class="[
                  'text-xs px-2 py-1 rounded-full font-medium',
                  getContentTypeBadge(item.type)
                ]">
                  {{ item.type.toUpperCase() }}
                </span>

                <!-- Priority -->
                <span v-if="item.priority === 'high'" class="text-xs px-2 py-1 rounded-full font-medium bg-red-900/20 text-red-400 border border-red-500/30">
                  HIGH PRIORITY
                </span>
              </div>

              <!-- Quick Actions -->
              <div class="flex items-center space-x-2">
                <button
                  @click="approveContent(item)"
                  class="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                  title="Approve"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
                <button
                  @click="rejectContent(item)"
                  class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Reject"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                <button
                  @click="viewDetails(item)"
                  class="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="View Details"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Content Body -->
          <div class="p-4">
            <!-- Text Content -->
            <div v-if="item.content" class="mb-3">
              <p class="text-gray-300 text-sm leading-relaxed">{{ item.content }}</p>
            </div>

            <!-- Media Content -->
            <div v-if="item.media && item.media.length > 0" class="mb-3">
              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="media in item.media.slice(0, 4)"
                  :key="media.id"
                  class="relative aspect-square bg-gray-700 rounded-lg overflow-hidden"
                >
                  <img
                    v-if="media.type === 'image'"
                    :src="media.url"
                    :alt="media.alt"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Flagged Reasons -->
            <div v-if="item.flaggedReasons && item.flaggedReasons.length > 0" class="mb-3">
              <h4 class="text-sm font-medium text-red-400 mb-2">Flagged for:</h4>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="reason in item.flaggedReasons"
                  :key="reason"
                  class="text-xs px-2 py-1 bg-red-900/20 text-red-400 border border-red-500/30 rounded"
                >
                  {{ reason }}
                </span>
              </div>
            </div>

            <!-- Reports -->
            <div v-if="item.reports && item.reports.length > 0" class="mb-3">
              <h4 class="text-sm font-medium text-yellow-400 mb-2">User Reports ({{ item.reports.length }}):</h4>
              <div class="space-y-2">
                <div
                  v-for="report in item.reports.slice(0, 3)"
                  :key="report.id"
                  class="bg-gray-700/50 rounded-lg p-3"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-400">{{ report.reporter.username }}</span>
                    <span class="text-xs text-gray-500">{{ formatTimeAgo(report.createdAt) }}</span>
                  </div>
                  <p class="text-sm text-gray-300">{{ report.reason }}</p>
                </div>
              </div>
            </div>

            <!-- AI Analysis -->
            <div v-if="item.aiAnalysis" class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <h4 class="text-sm font-medium text-blue-400 mb-2">AI Analysis:</h4>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-300">Toxicity Score:</span>
                  <div class="flex items-center space-x-2">
                    <div class="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        :class="[
                          'h-2 rounded-full',
                          item.aiAnalysis.toxicity > 0.7 ? 'bg-red-500' :
                          item.aiAnalysis.toxicity > 0.4 ? 'bg-yellow-500' :
                          'bg-green-500'
                        ]"
                        :style="{ width: (item.aiAnalysis.toxicity * 100) + '%' }"
                      ></div>
                    </div>
                    <span class="text-sm text-white">{{ Math.round(item.aiAnalysis.toxicity * 100) }}%</span>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-300">Spam Score:</span>
                  <div class="flex items-center space-x-2">
                    <div class="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        :class="[
                          'h-2 rounded-full',
                          item.aiAnalysis.spam > 0.7 ? 'bg-red-500' :
                          item.aiAnalysis.spam > 0.4 ? 'bg-yellow-500' :
                          'bg-green-500'
                        ]"
                        :style="{ width: (item.aiAnalysis.spam * 100) + '%' }"
                      ></div>
                    </div>
                    <span class="text-sm text-white">{{ Math.round(item.aiAnalysis.spam * 100) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Moderation Tools Sidebar -->
      <div class="space-y-6">
        <!-- Moderation Guidelines -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 class="text-lg font-semibold text-white mb-4">Moderation Guidelines</h3>
          <div class="space-y-3 text-sm">
            <div class="flex items-start space-x-2">
              <div class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <p class="text-gray-300">Hate speech, harassment, or threats should be immediately rejected</p>
            </div>
            <div class="flex items-start space-x-2">
              <div class="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <p class="text-gray-300">Spam or promotional content without context should be reviewed carefully</p>
            </div>
            <div class="flex items-start space-x-2">
              <div class="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p class="text-gray-300">Quality content that follows community guidelines should be approved</p>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 class="text-lg font-semibold text-white mb-4">Your Moderation Stats</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Reviews Today</span>
              <span class="text-white font-medium">{{ moderatorStats.reviewsToday }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Approval Rate</span>
              <span class="text-green-400 font-medium">{{ moderatorStats.approvalRate }}%</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Avg Review Time</span>
              <span class="text-blue-400 font-medium">{{ moderatorStats.avgReviewTime }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Accuracy Score</span>
              <span class="text-purple-400 font-medium">{{ moderatorStats.accuracy }}%</span>
            </div>
          </div>
        </div>

        <!-- Recent Actions -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 class="text-lg font-semibold text-white mb-4">Recent Actions</h3>
          <div class="space-y-3">
            <div
              v-for="action in recentActions"
              :key="action.id"
              class="flex items-center space-x-3 p-2 bg-gray-700/30 rounded-lg"
            >
              <div :class="[
                'w-8 h-8 rounded-full flex items-center justify-center',
                action.type === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              ]">
                <svg v-if="action.type === 'approved'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-white text-sm font-medium">{{ action.type === 'approved' ? 'Approved' : 'Rejected' }}</p>
                <p class="text-gray-400 text-xs truncate">{{ action.content }}</p>
                <p class="text-gray-500 text-xs">{{ formatTimeAgo(action.timestamp) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminAPI } from '@/services/api'

// Component state
const loading = ref(false)
const activeQueue = ref('pending')
const autoModerationEnabled = ref(true)
const selectedItems = ref([])

// Mock data - in real implementation, this would come from API
const stats = ref({
  pending: 24,
  avgWaitTime: '2.3h',
  reported: 8,
  highPriority: 3,
  approvedToday: 156,
  approvalRate: 87,
  autoModerated: 342,
  accuracy: 94
})

const moderatorStats = ref({
  reviewsToday: 43,
  approvalRate: 89,
  avgReviewTime: '1.2m',
  accuracy: 96
})

const contentItems = ref([
  {
    id: 1,
    type: 'post',
    content: 'Just discovered this amazing new DeFi protocol! The yields are incredible, check it out: [link]',
    author: { username: 'crypto_enthusiast', id: 123 },
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    priority: 'normal',
    media: [],
    flaggedReasons: ['Potential spam', 'Promotional content'],
    reports: [
      {
        id: 1,
        reporter: { username: 'user123' },
        reason: 'Suspicious link and promotional language',
        createdAt: new Date(Date.now() - 15 * 60 * 1000)
      }
    ],
    aiAnalysis: {
      toxicity: 0.12,
      spam: 0.67
    }
  },
  {
    id: 2,
    type: 'comment',
    content: 'This is completely wrong! You people have no idea what you\'re talking about. Absolute garbage!',
    author: { username: 'angry_trader', id: 456 },
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
    priority: 'high',
    media: [],
    flaggedReasons: ['Hostile language', 'Harassment'],
    reports: [
      {
        id: 2,
        reporter: { username: 'victim_user' },
        reason: 'Harassment and hostile behavior',
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: 3,
        reporter: { username: 'another_user' },
        reason: 'Toxic behavior, creates negative environment',
        createdAt: new Date(Date.now() - 25 * 60 * 1000)
      }
    ],
    aiAnalysis: {
      toxicity: 0.89,
      spam: 0.23
    }
  }
])

const recentActions = ref([
  {
    id: 1,
    type: 'approved',
    content: 'Great project! Love the innovation in this space...',
    timestamp: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 2,
    type: 'rejected',
    content: 'Buy my course now! Limited time offer...',
    timestamp: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    id: 3,
    type: 'approved',
    content: 'Thanks for sharing this valuable insight about...',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  }
])

// Methods
const formatTimeAgo = (timestamp) => {
  const now = new Date()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const getContentTypeBadge = (type) => {
  const badges = {
    post: 'bg-blue-900/20 text-blue-400 border border-blue-500/30',
    comment: 'bg-green-900/20 text-green-400 border border-green-500/30',
    message: 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
  }
  return badges[type] || 'bg-gray-900/20 text-gray-400 border border-gray-500/30'
}

const toggleSelection = (itemId) => {
  const index = selectedItems.value.indexOf(itemId)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(itemId)
  }
}

const switchQueue = () => {
  selectedItems.value = []
  loadContent()
}

const toggleAutoModeration = () => {
  autoModerationEnabled.value = !autoModerationEnabled.value
  
  if (window.__adminNotifications) {
    window.__adminNotifications.info(
      `Auto-moderation ${autoModerationEnabled.value ? 'enabled' : 'disabled'}`
    )
  }
}

const loadContent = async () => {
  loading.value = true
  try {
    // In real implementation, load content based on activeQueue
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success(`Loaded ${activeQueue.value} content`)
    }
  } catch (error) {
    console.error('Failed to load content:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to load content')
    }
  } finally {
    loading.value = false
  }
}

const refreshContent = () => {
  loadContent()
}

const approveContent = async (item) => {
  try {
    await adminAPI.approvePost(item.id)
    
    // Remove from current view
    const index = contentItems.value.findIndex(i => i.id === item.id)
    if (index > -1) {
      contentItems.value.splice(index, 1)
    }
    
    // Add to recent actions
    recentActions.value.unshift({
      id: Date.now(),
      type: 'approved',
      content: item.content.substring(0, 50) + '...',
      timestamp: new Date()
    })
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success('Content approved successfully')
    }
  } catch (error) {
    console.error('Failed to approve content:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to approve content')
    }
  }
}

const rejectContent = async (item) => {
  const reason = prompt('Enter rejection reason (optional):')
  
  try {
    await adminAPI.rejectPost(item.id, { reason })
    
    // Remove from current view
    const index = contentItems.value.findIndex(i => i.id === item.id)
    if (index > -1) {
      contentItems.value.splice(index, 1)
    }
    
    // Add to recent actions
    recentActions.value.unshift({
      id: Date.now(),
      type: 'rejected',
      content: item.content.substring(0, 50) + '...',
      timestamp: new Date()
    })
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success('Content rejected successfully')
    }
  } catch (error) {
    console.error('Failed to reject content:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to reject content')
    }
  }
}

const viewDetails = (item) => {
  // In real implementation, open detailed view modal
  console.log('View details for:', item)
}

const bulkApprove = async () => {
  if (selectedItems.value.length === 0) return
  
  try {
    // In real implementation, bulk approve selected items
    await Promise.all(
      selectedItems.value.map(id => {
        const item = contentItems.value.find(i => i.id === id)
        return item ? approveContent(item) : Promise.resolve()
      })
    )
    
    selectedItems.value = []
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success('Bulk approval completed')
    }
  } catch (error) {
    console.error('Failed to bulk approve:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Bulk approval failed')
    }
  }
}

const bulkReject = async () => {
  if (selectedItems.value.length === 0) return
  
  const reason = prompt('Enter rejection reason for all selected items:')
  
  try {
    // In real implementation, bulk reject selected items
    await Promise.all(
      selectedItems.value.map(id => {
        const item = contentItems.value.find(i => i.id === id)
        return item ? rejectContent(item) : Promise.resolve()
      })
    )
    
    selectedItems.value = []
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success('Bulk rejection completed')
    }
  } catch (error) {
    console.error('Failed to bulk reject:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Bulk rejection failed')
    }
  }
}

// Lifecycle
onMounted(() => {
  loadContent()
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Toggle switch animation */
.translate-x-5 {
  transform: translateX(1.25rem);
}

.translate-x-0 {
  transform: translateX(0);
}

/* Content item animations */
.hover\:border-gray-600:hover {
  border-color: rgb(75 85 99);
}

/* Progress bar animations */
.bg-red-500,
.bg-yellow-500,
.bg-green-500 {
  transition: width 0.3s ease;
}

/* Button hover effects */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

button:disabled {
  transform: none;
}

/* Loading animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Card selection effect */
.ring-2 {
  box-shadow: 0 0 0 2px rgb(59 130 246);
}

/* Checkbox styling */
input[type="checkbox"]:checked {
  background-color: rgb(59 130 246);
  border-color: rgb(59 130 246);
}
</style>